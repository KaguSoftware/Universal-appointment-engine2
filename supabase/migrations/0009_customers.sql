-- First-class customer records (CRM).
--
-- Today the only "customer" identity is appointments.customer_id -> profiles(id),
-- which only exists for logged-in customers; guest bookings just stash
-- guest_name/email/phone on the appointment and are otherwise anonymous. That
-- means no repeat-client view, no history, no spend/no-show tracking.
--
-- This migration adds a tenant-scoped `customers` table (distinct from the
-- auth-bound `profiles` table), links appointments to it via a new
-- `customer_record_id`, and provides an upsert helper used at booking time plus
-- a one-time backfill of existing guest/appointment data.

-- ---------------------------------------------------------------------------
-- customers
-- ---------------------------------------------------------------------------
create table customers (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  name            text not null,
  email           text,
  phone           text,
  notes           text,
  tags            text[] not null default '{}',
  total_no_shows  int not null default 0,
  total_spend     numeric(12,2) not null default 0,
  created_at      timestamptz not null default now()
);
create index on customers (tenant_id);
-- One customer row per email within a tenant (nulls are allowed to repeat).
create unique index customers_tenant_email_idx
  on customers (tenant_id, lower(email)) where email is not null;

alter table appointments
  add column customer_record_id uuid references customers(id) on delete set null;
create index on appointments (customer_record_id);

-- ---------------------------------------------------------------------------
-- RLS: tenant members read, admins write (mirrors services/staff).
-- Booking-time writes go through the SECURITY DEFINER upsert RPC below.
-- ---------------------------------------------------------------------------
alter table customers enable row level security;

create policy customers_read on customers for select
  using (is_member_of(tenant_id) or is_superadmin());
create policy customers_write on customers for all
  using (is_admin_of(tenant_id) or is_member_of(tenant_id) or is_superadmin())
  with check (is_member_of(tenant_id) or is_superadmin());

-- ---------------------------------------------------------------------------
-- upsert_customer: find-or-create a customer for a tenant by email (falling
-- back to phone), keeping the most recent name/contact details. Returns the id.
-- SECURITY DEFINER so it can run from anon/public booking RPCs.
-- ---------------------------------------------------------------------------
create or replace function upsert_customer(
  p_tenant uuid,
  p_name text,
  p_email text default null,
  p_phone text default null
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  if p_name is null or length(trim(p_name)) = 0 then
    return null;
  end if;

  if p_email is not null and length(trim(p_email)) > 0 then
    select id into v_id from customers
    where tenant_id = p_tenant and lower(email) = lower(p_email);
  elsif p_phone is not null and length(trim(p_phone)) > 0 then
    select id into v_id from customers
    where tenant_id = p_tenant and phone = p_phone
    order by created_at limit 1;
  end if;

  if v_id is null then
    insert into customers (tenant_id, name, email, phone)
    values (p_tenant, trim(p_name), nullif(trim(p_email), ''), nullif(trim(p_phone), ''))
    returning id into v_id;
  else
    update customers set
      name  = coalesce(nullif(trim(p_name), ''), name),
      email = coalesce(nullif(trim(p_email), ''), email),
      phone = coalesce(nullif(trim(p_phone), ''), phone)
    where id = v_id;
  end if;

  return v_id;
end;
$$;

grant execute on function upsert_customer(uuid, text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Backfill: create customer rows from existing appointments (guest data first,
-- else the linked profile) and link them via customer_record_id.
-- ---------------------------------------------------------------------------
do $$
declare
  a record;
  v_name text;
  v_email text;
  v_phone text;
  v_id uuid;
begin
  for a in
    select ap.id, ap.tenant_id, ap.guest_name, ap.guest_email, ap.guest_phone,
           p.full_name, p.phone as profile_phone,
           (select email from auth.users u where u.id = ap.customer_id) as profile_email
    from appointments ap
    left join profiles p on p.id = ap.customer_id
    where ap.customer_record_id is null
  loop
    v_name  := coalesce(a.guest_name, a.full_name);
    v_email := coalesce(a.guest_email, a.profile_email);
    v_phone := coalesce(a.guest_phone, a.profile_phone);
    if v_name is null then
      continue;
    end if;
    v_id := upsert_customer(a.tenant_id, v_name, v_email, v_phone);
    update appointments set customer_record_id = v_id where id = a.id;
  end loop;
end;
$$;
