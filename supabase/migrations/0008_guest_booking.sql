-- Guest booking + self-service management by token + admin walk-in bookings.
--
-- Before this, every appointment required customer_id -> profiles(id), i.e. the
-- customer had to create an account and log in to book. That kills real-world
-- use for barbershops/dentists/etc. This migration:
--   * makes customer_id nullable and adds guest contact columns,
--   * adds an unguessable manage_token so guests can view/reschedule/cancel
--     via a link without an account,
--   * flags admin/walk-in bookings,
--   * rewrites create_appointment to support guest + logged-in customers and
--     grants it to anon,
--   * adds token-scoped management RPCs (anon) and an admin walk-in RPC.

-- Drop the old 5-arg signature so the rewritten create_appointment below
-- (with guest params) is unambiguous.
drop function if exists create_appointment(uuid, uuid, uuid, timestamptz, text);

-- ---------------------------------------------------------------------------
-- Schema changes
-- ---------------------------------------------------------------------------
alter table appointments
  alter column customer_id drop not null,
  add column guest_name    text,
  add column guest_email   text,
  add column guest_phone   text,
  add column manage_token  uuid not null default gen_random_uuid(),
  add column created_by_staff boolean not null default false;

-- Every appointment must be attributable to either a logged-in customer or a
-- guest contact (name at minimum).
alter table appointments
  add constraint appointments_customer_or_guest
  check (customer_id is not null or guest_name is not null);

create unique index appointments_manage_token_idx on appointments (manage_token);

-- ---------------------------------------------------------------------------
-- Rewrite: create_appointment now supports guest bookings (anon) as well as
-- authenticated customers. Guest fields are used when there is no auth.uid().
-- ---------------------------------------------------------------------------
create or replace function create_appointment(
  p_tenant uuid,
  p_service uuid,
  p_staff uuid,
  p_start timestamptz,
  p_notes text default null,
  p_guest_name text default null,
  p_guest_email text default null,
  p_guest_phone text default null
)
returns appointments
language plpgsql security definer set search_path = public as $$
declare
  v_customer uuid := auth.uid();
  v_duration int;
  v_end timestamptz;
  v_row appointments;
begin
  -- A booking must identify the customer: either a logged-in user, or a guest
  -- with at least a name + one contact method.
  if v_customer is null then
    if p_guest_name is null or length(trim(p_guest_name)) = 0
       or (p_guest_email is null and p_guest_phone is null) then
      raise exception 'GUEST_DETAILS_REQUIRED';
    end if;
  end if;

  select duration_min into v_duration
  from services
  where id = p_service and tenant_id = p_tenant and active = true;

  if v_duration is null then
    raise exception 'SERVICE_NOT_FOUND';
  end if;

  if not exists (
    select 1 from staff_services
    where staff_id = p_staff and service_id = p_service
  ) then
    raise exception 'STAFF_SERVICE_MISMATCH';
  end if;

  v_end := p_start + make_interval(mins => v_duration);

  insert into appointments (tenant_id, service_id, staff_id, customer_id,
                            start_at, end_at, notes,
                            guest_name, guest_email, guest_phone)
  values (p_tenant, p_service, p_staff,
          v_customer, p_start, v_end, p_notes,
          case when v_customer is null then p_guest_name  else null end,
          case when v_customer is null then p_guest_email else null end,
          case when v_customer is null then p_guest_phone else null end)
  returning * into v_row;

  return v_row;
exception
  when exclusion_violation then
    raise exception 'SLOT_TAKEN';
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin walk-in: a tenant member books on behalf of a (guest) customer.
-- ---------------------------------------------------------------------------
create or replace function create_appointment_admin(
  p_tenant uuid,
  p_service uuid,
  p_staff uuid,
  p_start timestamptz,
  p_guest_name text,
  p_guest_email text default null,
  p_guest_phone text default null,
  p_notes text default null
)
returns appointments
language plpgsql security definer set search_path = public as $$
declare
  v_duration int;
  v_end timestamptz;
  v_row appointments;
begin
  if not is_member_of(p_tenant) then
    raise exception 'FORBIDDEN';
  end if;

  if p_guest_name is null or length(trim(p_guest_name)) = 0 then
    raise exception 'GUEST_DETAILS_REQUIRED';
  end if;

  select duration_min into v_duration
  from services
  where id = p_service and tenant_id = p_tenant and active = true;
  if v_duration is null then
    raise exception 'SERVICE_NOT_FOUND';
  end if;

  if not exists (
    select 1 from staff_services
    where staff_id = p_staff and service_id = p_service
  ) then
    raise exception 'STAFF_SERVICE_MISMATCH';
  end if;

  v_end := p_start + make_interval(mins => v_duration);

  insert into appointments (tenant_id, service_id, staff_id,
                            start_at, end_at, notes,
                            guest_name, guest_email, guest_phone,
                            created_by_staff)
  values (p_tenant, p_service, p_staff, p_start, v_end, p_notes,
          p_guest_name, p_guest_email, p_guest_phone, true)
  returning * into v_row;

  return v_row;
exception
  when exclusion_violation then
    raise exception 'SLOT_TAKEN';
end;
$$;

-- ---------------------------------------------------------------------------
-- Token-scoped self-service management (no account). The manage_token is an
-- unguessable uuid delivered to the customer; possession authorizes access to
-- exactly one appointment.
-- ---------------------------------------------------------------------------
create or replace function manage_get_appointment(p_token uuid)
returns table (
  id uuid, tenant_id uuid, service_id uuid, staff_id uuid,
  start_at timestamptz, end_at timestamptz, status appointment_status,
  service_name text, staff_name text, tenant_name text, tenant_slug text,
  timezone text
)
language sql stable security definer set search_path = public as $$
  select a.id, a.tenant_id, a.service_id, a.staff_id,
         a.start_at, a.end_at, a.status,
         svc.name, st.display_name, t.name, t.slug, t.timezone
  from appointments a
  join services svc on svc.id = a.service_id
  join staff st on st.id = a.staff_id
  join tenants t on t.id = a.tenant_id
  where a.manage_token = p_token;
$$;

create or replace function cancel_by_token(p_token uuid)
returns appointments
language plpgsql security definer set search_path = public as $$
declare v_row appointments;
begin
  select * into v_row from appointments where manage_token = p_token;
  if v_row.id is null then
    raise exception 'NOT_FOUND';
  end if;
  if v_row.status <> 'booked' then
    raise exception 'NOT_CANCELLABLE';
  end if;
  update appointments set status = 'cancelled'
  where manage_token = p_token
  returning * into v_row;
  return v_row;
end;
$$;

create or replace function reschedule_by_token(p_token uuid, p_start timestamptz)
returns appointments
language plpgsql security definer set search_path = public as $$
declare
  v_row appointments;
  v_duration int;
begin
  select * into v_row from appointments where manage_token = p_token;
  if v_row.id is null then
    raise exception 'NOT_FOUND';
  end if;
  if v_row.status <> 'booked' then
    raise exception 'NOT_RESCHEDULABLE';
  end if;
  select duration_min into v_duration from services where id = v_row.service_id;
  update appointments
    set start_at = p_start,
        end_at   = p_start + make_interval(mins => v_duration)
  where manage_token = p_token
  returning * into v_row;
  return v_row;
exception
  when exclusion_violation then
    raise exception 'SLOT_TAKEN';
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
grant execute on function create_appointment(
  uuid, uuid, uuid, timestamptz, text, text, text, text) to anon, authenticated;
grant execute on function create_appointment_admin(
  uuid, uuid, uuid, timestamptz, text, text, text, text) to authenticated;
grant execute on function manage_get_appointment(uuid) to anon, authenticated;
grant execute on function cancel_by_token(uuid) to anon, authenticated;
grant execute on function reschedule_by_token(uuid, timestamptz) to anon, authenticated;
