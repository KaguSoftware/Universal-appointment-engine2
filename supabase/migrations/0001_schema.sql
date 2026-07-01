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
