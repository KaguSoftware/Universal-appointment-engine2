-- Universal Appointment Engine — core schema
-- Extensions, enums, and tables. RLS lives in 0002, RPCs in 0003, seed in 0004.

create extension if not exists "btree_gist";
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type vertical_id as enum
  ('barbershop', 'dentist', 'tutor', 'therapist', 'mechanic');
create type plan_id as enum ('free', 'pro');
create type membership_role as enum ('admin', 'staff');
create type appointment_status as enum
  ('booked', 'cancelled', 'completed', 'no_show');
create type override_type as enum ('block', 'extra');
create type tenant_status as enum ('active', 'suspended');

-- ---------------------------------------------------------------------------
-- Tenants
-- ---------------------------------------------------------------------------
create table tenants (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name        text not null,
  vertical    vertical_id not null,
  plan        plan_id not null default 'free',
  timezone    text not null default 'UTC',
  theme       jsonb not null default '{}'::jsonb,
  status      tenant_status not null default 'active',
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users; includes customers)
-- ---------------------------------------------------------------------------
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  phone       text,
  avatar_url  text,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Memberships (staff/admin scoped to a tenant)
-- ---------------------------------------------------------------------------
create table memberships (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        membership_role not null,
  created_at  timestamptz not null default now(),
  unique (tenant_id, user_id)
);
create index on memberships (user_id);
create index on memberships (tenant_id);

-- ---------------------------------------------------------------------------
-- Staff (providers)
-- ---------------------------------------------------------------------------
create table staff (
  id                        uuid primary key default gen_random_uuid(),
  tenant_id                 uuid not null references tenants(id) on delete cascade,
  profile_id                uuid references profiles(id) on delete set null,
  display_name              text not null,
  bio                       text,
  color                     text not null default '#64748b',
  google_calendar_connected boolean not null default false,
  active                    boolean not null default true,
  created_at                timestamptz not null default now()
);
create index on staff (tenant_id);

-- ---------------------------------------------------------------------------
-- Services
-- ---------------------------------------------------------------------------
create table services (
  id                 uuid primary key default gen_random_uuid(),
  tenant_id          uuid not null references tenants(id) on delete cascade,
  name               text not null,
  description        text,
  duration_min       int not null check (duration_min > 0),
  buffer_before_min  int not null default 0 check (buffer_before_min >= 0),
  buffer_after_min   int not null default 0 check (buffer_after_min >= 0),
  price              numeric(10,2) not null default 0,
  currency           text not null default 'USD',
  active             boolean not null default true,
  created_at         timestamptz not null default now()
);
create index on services (tenant_id);

create table staff_services (
  staff_id    uuid not null references staff(id) on delete cascade,
  service_id  uuid not null references services(id) on delete cascade,
  primary key (staff_id, service_id)
);

-- ---------------------------------------------------------------------------
-- Availability
-- ---------------------------------------------------------------------------
create table availability_rules (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  staff_id    uuid not null references staff(id) on delete cascade,
  weekday     int not null check (weekday between 0 and 6),
  start_time  time not null,
  end_time    time not null,
  check (end_time > start_time)
);
create index on availability_rules (staff_id);

create table availability_overrides (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  staff_id    uuid not null references staff(id) on delete cascade,
  date        date not null,
  type        override_type not null,
  start_time  time not null,
  end_time    time not null,
  check (end_time > start_time)
);
create index on availability_overrides (staff_id, date);

-- ---------------------------------------------------------------------------
-- Appointments (double-booking prevented by the exclusion constraint)
-- ---------------------------------------------------------------------------
create table appointments (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references tenants(id) on delete cascade,
  service_id       uuid not null references services(id),
  staff_id         uuid not null references staff(id) on delete cascade,
  customer_id      uuid not null references profiles(id),
  start_at         timestamptz not null,
  end_at           timestamptz not null,
  status           appointment_status not null default 'booked',
  notes            text,
  google_event_id  text,
  created_at       timestamptz not null default now(),
  check (end_at > start_at),
  -- No two active appointments for the same staff may overlap in time.
  constraint appointments_no_overlap
    exclude using gist (
      staff_id with =,
      tstzrange(start_at, end_at) with &&
    ) where (status in ('booked', 'completed'))
);
create index on appointments (tenant_id, start_at);
create index on appointments (staff_id, start_at);
create index on appointments (customer_id);

-- ---------------------------------------------------------------------------
-- Subscriptions (platform billing via Iyzico)
-- ---------------------------------------------------------------------------
create table subscriptions (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references tenants(id) on delete cascade,
  plan                plan_id not null,
  iyzico_ref          text,
  status              text not null default 'active',
  current_period_end  timestamptz,
  created_at          timestamptz not null default now(),
  unique (tenant_id)
);

-- ---------------------------------------------------------------------------
-- Notifications log (idempotency + audit)
-- ---------------------------------------------------------------------------
create table notifications_log (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  appointment_id  uuid references appointments(id) on delete cascade,
  channel         text not null,       -- 'email' | 'sms'
  type            text not null,       -- 'confirmation' | 'cancellation' | 'reminder'
  status          text not null,       -- 'sent' | 'failed'
  sent_at         timestamptz not null default now(),
  unique (appointment_id, channel, type)
);
-- Row-Level Security. Tenant isolation keyed on tenant_id via membership.

-- ---------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER so they can read memberships under RLS)
-- ---------------------------------------------------------------------------
create or replace function is_member_of(t uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from memberships m
    where m.tenant_id = t and m.user_id = auth.uid()
  );
$$;

create or replace function is_admin_of(t uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from memberships m
    where m.tenant_id = t and m.user_id = auth.uid() and m.role = 'admin'
  );
$$;

-- Super-admin allowlist driven by the JWT email claim.
create or replace function is_superadmin()
returns boolean language sql stable as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'superadmin')::boolean,
    false
  );
$$;

-- ---------------------------------------------------------------------------
-- Enable RLS
-- ---------------------------------------------------------------------------
alter table tenants               enable row level security;
alter table profiles              enable row level security;
alter table memberships           enable row level security;
alter table staff                 enable row level security;
alter table services              enable row level security;
alter table staff_services        enable row level security;
alter table availability_rules    enable row level security;
alter table availability_overrides enable row level security;
alter table appointments          enable row level security;
alter table subscriptions         enable row level security;
alter table notifications_log     enable row level security;

-- ---------------------------------------------------------------------------
-- Tenants: members read; admins + superadmin write.
-- ---------------------------------------------------------------------------
create policy tenants_read on tenants for select
  using (is_member_of(id) or is_superadmin());
create policy tenants_write on tenants for all
  using (is_admin_of(id) or is_superadmin())
  with check (is_admin_of(id) or is_superadmin());

-- ---------------------------------------------------------------------------
-- Profiles: a user manages only their own row.
-- ---------------------------------------------------------------------------
create policy profiles_self on profiles for all
  using (id = auth.uid()) with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- Memberships: members of a tenant can read; admins/superadmin manage.
-- ---------------------------------------------------------------------------
create policy memberships_read on memberships for select
  using (is_member_of(tenant_id) or is_superadmin());
create policy memberships_write on memberships for all
  using (is_admin_of(tenant_id) or is_superadmin())
  with check (is_admin_of(tenant_id) or is_superadmin());

-- ---------------------------------------------------------------------------
-- Tenant-scoped config: members read, admins write.
-- (Public booking reads go through SECURITY DEFINER RPCs, not these policies.)
-- ---------------------------------------------------------------------------
create policy staff_read on staff for select
  using (is_member_of(tenant_id) or is_superadmin());
create policy staff_write on staff for all
  using (is_admin_of(tenant_id) or is_superadmin())
  with check (is_admin_of(tenant_id) or is_superadmin());

create policy services_read on services for select
  using (is_member_of(tenant_id) or is_superadmin());
create policy services_write on services for all
  using (is_admin_of(tenant_id) or is_superadmin())
  with check (is_admin_of(tenant_id) or is_superadmin());

create policy staff_services_rw on staff_services for all
  using (exists (select 1 from staff s
                 where s.id = staff_services.staff_id
                   and (is_admin_of(s.tenant_id) or is_superadmin())))
  with check (exists (select 1 from staff s
                 where s.id = staff_services.staff_id
                   and (is_admin_of(s.tenant_id) or is_superadmin())));

create policy avail_rules_read on availability_rules for select
  using (is_member_of(tenant_id) or is_superadmin());
create policy avail_rules_write on availability_rules for all
  using (is_admin_of(tenant_id) or is_member_of(tenant_id) or is_superadmin())
  with check (is_member_of(tenant_id) or is_superadmin());

create policy avail_over_read on availability_overrides for select
  using (is_member_of(tenant_id) or is_superadmin());
create policy avail_over_write on availability_overrides for all
  using (is_member_of(tenant_id) or is_superadmin())
  with check (is_member_of(tenant_id) or is_superadmin());

-- ---------------------------------------------------------------------------
-- Appointments: tenant members see all; customers see their own.
-- Inserts are done through the create_appointment RPC (SECURITY DEFINER),
-- so no public INSERT policy is granted here.
-- ---------------------------------------------------------------------------
create policy appts_member_read on appointments for select
  using (is_member_of(tenant_id) or is_superadmin());
create policy appts_customer_read on appointments for select
  using (customer_id = auth.uid());
create policy appts_member_write on appointments for update
  using (is_member_of(tenant_id) or is_superadmin())
  with check (is_member_of(tenant_id) or is_superadmin());
-- Customers may cancel their own appointment (status change enforced in app).
create policy appts_customer_update on appointments for update
  using (customer_id = auth.uid())
  with check (customer_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Subscriptions & notifications: admins/superadmin only.
-- ---------------------------------------------------------------------------
create policy subs_rw on subscriptions for all
  using (is_admin_of(tenant_id) or is_superadmin())
  with check (is_admin_of(tenant_id) or is_superadmin());

create policy notif_read on notifications_log for select
  using (is_member_of(tenant_id) or is_superadmin());
-- Public booking RPCs (SECURITY DEFINER) + transactional booking/cancel.
-- These expose exactly the data the public booking flow needs, so we don't
-- grant broad SELECT to anon on the underlying tables.

-- ---------------------------------------------------------------------------
-- Public: resolve a tenant by slug (booking landing).
-- ---------------------------------------------------------------------------
create or replace function public_get_tenant(p_slug text)
returns table (
  id uuid, slug text, name text, vertical vertical_id,
  plan plan_id, timezone text, theme jsonb
)
language sql stable security definer set search_path = public as $$
  select t.id, t.slug, t.name, t.vertical, t.plan, t.timezone, t.theme
  from tenants t
  where t.slug = p_slug and t.status = 'active';
$$;

-- ---------------------------------------------------------------------------
-- Public: active services for a tenant.
-- ---------------------------------------------------------------------------
create or replace function public_list_services(p_tenant uuid)
returns setof services
language sql stable security definer set search_path = public as $$
  select * from services
  where tenant_id = p_tenant and active = true
  order by name;
$$;

-- ---------------------------------------------------------------------------
-- Public: active staff who can perform a given service.
-- ---------------------------------------------------------------------------
create or replace function public_list_staff_for_service(p_service uuid)
returns setof staff
language sql stable security definer set search_path = public as $$
  select s.* from staff s
  join staff_services ss on ss.staff_id = s.id
  where ss.service_id = p_service and s.active = true
  order by s.display_name;
$$;

-- ---------------------------------------------------------------------------
-- Public: data needed to compute slots for a staff member over a date range.
-- Returns rules, overrides in range, and non-cancelled appointments in range.
-- ---------------------------------------------------------------------------
create or replace function public_availability_data(
  p_staff uuid, p_from date, p_to date
)
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'rules', coalesce((
      select jsonb_agg(to_jsonb(r)) from availability_rules r
      where r.staff_id = p_staff), '[]'::jsonb),
    'overrides', coalesce((
      select jsonb_agg(to_jsonb(o)) from availability_overrides o
      where o.staff_id = p_staff and o.date between p_from and p_to), '[]'::jsonb),
    'appointments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'start_at', a.start_at, 'end_at', a.end_at))
      from appointments a
      where a.staff_id = p_staff
        and a.status in ('booked', 'completed')
        and a.start_at < (p_to + 1)::timestamptz
        and a.end_at   > p_from::timestamptz), '[]'::jsonb)
  );
$$;

-- ---------------------------------------------------------------------------
-- Book: transactional insert. Relies on the exclusion constraint to reject
-- overlaps; surfaces a clean error on conflict. Runs as the authenticated
-- customer (auth.uid()).
-- ---------------------------------------------------------------------------
create or replace function create_appointment(
  p_tenant uuid,
  p_service uuid,
  p_staff uuid,
  p_start timestamptz,
  p_notes text default null
)
returns appointments
language plpgsql security definer set search_path = public as $$
declare
  v_customer uuid := auth.uid();
  v_duration int;
  v_end timestamptz;
  v_row appointments;
begin
  if v_customer is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select duration_min into v_duration
  from services
  where id = p_service and tenant_id = p_tenant and active = true;

  if v_duration is null then
    raise exception 'SERVICE_NOT_FOUND';
  end if;

  -- Ensure the staff member can perform this service.
  if not exists (
    select 1 from staff_services
    where staff_id = p_staff and service_id = p_service
  ) then
    raise exception 'STAFF_SERVICE_MISMATCH';
  end if;

  v_end := p_start + make_interval(mins => v_duration);

  insert into appointments (tenant_id, service_id, staff_id, customer_id,
                            start_at, end_at, notes)
  values (p_tenant, p_service, p_staff, v_customer, p_start, v_end, p_notes)
  returning * into v_row;

  return v_row;
exception
  when exclusion_violation then
    raise exception 'SLOT_TAKEN';
end;
$$;

-- ---------------------------------------------------------------------------
-- Cancel: a customer cancels their own appointment, or a tenant member does.
-- ---------------------------------------------------------------------------
create or replace function cancel_appointment(p_appointment uuid)
returns appointments
language plpgsql security definer set search_path = public as $$
declare
  v_row appointments;
begin
  select * into v_row from appointments where id = p_appointment;
  if v_row.id is null then
    raise exception 'NOT_FOUND';
  end if;

  if not (v_row.customer_id = auth.uid() or is_member_of(v_row.tenant_id)) then
    raise exception 'FORBIDDEN';
  end if;

  update appointments set status = 'cancelled'
  where id = p_appointment
  returning * into v_row;

  return v_row;
end;
$$;

-- Expose the public RPCs to anon + authenticated roles.
grant execute on function public_get_tenant(text) to anon, authenticated;
grant execute on function public_list_services(uuid) to anon, authenticated;
grant execute on function public_list_staff_for_service(uuid) to anon, authenticated;
grant execute on function public_availability_data(uuid, date, date) to anon, authenticated;
grant execute on function create_appointment(uuid, uuid, uuid, timestamptz, text) to authenticated;
grant execute on function cancel_appointment(uuid) to authenticated;
-- Per-staff Google Calendar OAuth tokens (Pro feature).
-- Stored server-side only; never exposed via public RPCs.

create table staff_google_tokens (
  staff_id       uuid primary key references staff(id) on delete cascade,
  tenant_id      uuid not null references tenants(id) on delete cascade,
  access_token   text,
  refresh_token  text not null,
  expiry         timestamptz,
  calendar_id    text not null default 'primary',
  created_at     timestamptz not null default now()
);

alter table staff_google_tokens enable row level security;

-- Only admins of the tenant may read connection status; tokens themselves are
-- accessed exclusively through the service-role client on the server.
create policy sgt_admin_read on staff_google_tokens for select
  using (is_admin_of(tenant_id) or is_superadmin());
-- Transactional reschedule: move an appointment to a new start time.
-- Honors the exclusion constraint (no overlap) and the same authorization
-- rules as cancellation (owner customer or a tenant member).

create or replace function reschedule_appointment(
  p_appointment uuid,
  p_start timestamptz
)
returns appointments
language plpgsql security definer set search_path = public as $$
declare
  v_row appointments;
  v_duration int;
begin
  select * into v_row from appointments where id = p_appointment;
  if v_row.id is null then
    raise exception 'NOT_FOUND';
  end if;

  if not (v_row.customer_id = auth.uid() or is_member_of(v_row.tenant_id)) then
    raise exception 'FORBIDDEN';
  end if;

  if v_row.status <> 'booked' then
    raise exception 'NOT_RESCHEDULABLE';
  end if;

  select duration_min into v_duration from services where id = v_row.service_id;

  update appointments
    set start_at = p_start,
        end_at   = p_start + make_interval(mins => v_duration)
  where id = p_appointment
  returning * into v_row;

  return v_row;
exception
  when exclusion_violation then
    raise exception 'SLOT_TAKEN';
end;
$$;

grant execute on function reschedule_appointment(uuid, timestamptz) to authenticated;
-- Availability data that can exclude a specific appointment (used when
-- rescheduling so the appointment's own slot is treated as free).

create or replace function public_availability_data_excluding(
  p_staff uuid, p_from date, p_to date, p_exclude uuid
)
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'rules', coalesce((
      select jsonb_agg(to_jsonb(r)) from availability_rules r
      where r.staff_id = p_staff), '[]'::jsonb),
    'overrides', coalesce((
      select jsonb_agg(to_jsonb(o)) from availability_overrides o
      where o.staff_id = p_staff and o.date between p_from and p_to), '[]'::jsonb),
    'appointments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'start_at', a.start_at, 'end_at', a.end_at))
      from appointments a
      where a.staff_id = p_staff
        and a.id <> p_exclude
        and a.status in ('booked', 'completed')
        and a.start_at < (p_to + 1)::timestamptz
        and a.end_at   > p_from::timestamptz), '[]'::jsonb)
  );
$$;

grant execute on function public_availability_data_excluding(uuid, date, date, uuid)
  to anon, authenticated;
-- Demo seed: one active tenant per vertical, each with a staff member,
-- services, and Mon–Fri 09:00–17:00 availability. Idempotent by slug.

do $$
declare
  v_tenant uuid;
  v_staff uuid;
  v_service uuid;
  v_day int;
  rec record;
begin
  for rec in
    select * from (values
      ('demo-barbershop', 'Sharp Cuts', 'barbershop'::vertical_id),
      ('demo-dentist',    'Bright Smile Dental', 'dentist'::vertical_id),
      ('demo-tutor',      'Ace Tutoring', 'tutor'::vertical_id),
      ('demo-therapist',  'Calm Mind Therapy', 'therapist'::vertical_id),
      ('demo-mechanic',   'Reliable Auto', 'mechanic'::vertical_id)
    ) as t(slug, name, vertical)
  loop
    if exists (select 1 from tenants where slug = rec.slug) then
      continue;
    end if;

    insert into tenants (slug, name, vertical, timezone)
    values (rec.slug, rec.name, rec.vertical, 'Europe/Istanbul')
    returning id into v_tenant;

    insert into staff (tenant_id, display_name, bio, color)
    values (v_tenant, 'Alex Demo', 'Demo provider', '#4f46e5')
    returning id into v_staff;

    -- Mon–Fri 09:00–17:00
    for v_day in 1..5 loop
      insert into availability_rules (tenant_id, staff_id, weekday, start_time, end_time)
      values (v_tenant, v_staff, v_day, '09:00', '17:00');
    end loop;

    -- Two generic services per demo tenant; real presets are seeded in-app.
    insert into services (tenant_id, name, duration_min, price)
    values (v_tenant, 'Standard', 30, 30)
    returning id into v_service;
    insert into staff_services (staff_id, service_id) values (v_staff, v_service);

    insert into services (tenant_id, name, duration_min, price)
    values (v_tenant, 'Extended', 60, 55)
    returning id into v_service;
    insert into staff_services (staff_id, service_id) values (v_staff, v_service);
  end loop;
end $$;
