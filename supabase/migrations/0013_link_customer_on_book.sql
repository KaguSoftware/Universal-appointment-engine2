-- Link every new booking to a CRM customer record.
--
-- 0009 added the customers table + upsert_customer(); this wires it into the
-- booking RPCs so guest and walk-in bookings populate the CRM automatically.
-- Also snapshots the service price onto the appointment for revenue reporting.

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
  v_price numeric(10,2);
  v_end timestamptz;
  v_cust_record uuid;
  v_name text;
  v_email text;
  v_phone text;
  v_row appointments;
begin
  if v_customer is null then
    if p_guest_name is null or length(trim(p_guest_name)) = 0
       or (p_guest_email is null and p_guest_phone is null) then
      raise exception 'GUEST_DETAILS_REQUIRED';
    end if;
  end if;

  select duration_min, price into v_duration, v_price
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

  -- Resolve customer contact details (logged-in profile or guest fields).
  if v_customer is not null then
    select coalesce(full_name, 'Customer'), phone into v_name, v_phone
    from profiles where id = v_customer;
    select email into v_email from auth.users where id = v_customer;
  else
    v_name := p_guest_name; v_email := p_guest_email; v_phone := p_guest_phone;
  end if;
  v_cust_record := upsert_customer(p_tenant, v_name, v_email, v_phone);

  insert into appointments (tenant_id, service_id, staff_id, customer_id,
                            start_at, end_at, notes,
                            guest_name, guest_email, guest_phone,
                            customer_record_id, price_snapshot)
  values (p_tenant, p_service, p_staff,
          v_customer, p_start, v_end, p_notes,
          case when v_customer is null then p_guest_name  else null end,
          case when v_customer is null then p_guest_email else null end,
          case when v_customer is null then p_guest_phone else null end,
          v_cust_record, v_price)
  returning * into v_row;

  return v_row;
exception
  when exclusion_violation then
    raise exception 'SLOT_TAKEN';
end;
$$;

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
  v_price numeric(10,2);
  v_end timestamptz;
  v_cust_record uuid;
  v_row appointments;
begin
  if not is_member_of(p_tenant) then
    raise exception 'FORBIDDEN';
  end if;
  if p_guest_name is null or length(trim(p_guest_name)) = 0 then
    raise exception 'GUEST_DETAILS_REQUIRED';
  end if;

  select duration_min, price into v_duration, v_price
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
  v_cust_record := upsert_customer(p_tenant, p_guest_name, p_guest_email, p_guest_phone);

  insert into appointments (tenant_id, service_id, staff_id,
                            start_at, end_at, notes,
                            guest_name, guest_email, guest_phone,
                            created_by_staff, customer_record_id, price_snapshot)
  values (p_tenant, p_service, p_staff, p_start, v_end, p_notes,
          p_guest_name, p_guest_email, p_guest_phone, true,
          v_cust_record, v_price)
  returning * into v_row;

  return v_row;
exception
  when exclusion_violation then
    raise exception 'SLOT_TAKEN';
end;
$$;

grant execute on function create_appointment(
  uuid, uuid, uuid, timestamptz, text, text, text, text) to anon, authenticated;
grant execute on function create_appointment_admin(
  uuid, uuid, uuid, timestamptz, text, text, text, text) to authenticated;
