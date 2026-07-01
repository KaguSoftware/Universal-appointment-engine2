-- Per-appointment payments: deposits and no-show protection.
--
-- Until now the only money in the system was the platform subscription
-- (subscriptions table, Iyzico). Businesses pay for booking software mainly to
-- capture deposits and charge no-shows, so this migration adds:
--   * per-service deposit policy,
--   * payment state on each appointment,
--   * a payments audit table (also the source for revenue analytics).

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type payment_status as enum
  ('none', 'deposit_paid', 'paid', 'refunded', 'failed');
create type deposit_type as enum ('none', 'fixed', 'percent');
create type payment_kind as enum ('deposit', 'full', 'no_show_fee', 'refund');

-- ---------------------------------------------------------------------------
-- Service deposit policy
-- ---------------------------------------------------------------------------
alter table services
  add column deposit_type    deposit_type not null default 'none',
  add column deposit_value   numeric(10,2) not null default 0
    check (deposit_value >= 0),
  add column require_payment boolean not null default false;

-- ---------------------------------------------------------------------------
-- Appointment payment state
-- ---------------------------------------------------------------------------
alter table appointments
  add column price_snapshot    numeric(10,2),
  add column deposit_amount    numeric(10,2),
  add column payment_status    payment_status not null default 'none',
  add column iyzico_payment_ref text;

-- ---------------------------------------------------------------------------
-- Payments audit / ledger
-- ---------------------------------------------------------------------------
create table payments (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  appointment_id  uuid references appointments(id) on delete set null,
  amount          numeric(10,2) not null,
  currency        text not null default 'USD',
  kind            payment_kind not null,
  iyzico_ref      text,
  status          text not null default 'pending',  -- 'pending' | 'succeeded' | 'failed'
  created_at      timestamptz not null default now()
);
create index on payments (tenant_id, created_at);
create index on payments (appointment_id);

-- ---------------------------------------------------------------------------
-- RLS: tenant members read, admins write. Payment writes from the booking /
-- webhook flow go through SECURITY DEFINER RPCs, not these policies.
-- ---------------------------------------------------------------------------
alter table payments enable row level security;

create policy payments_read on payments for select
  using (is_member_of(tenant_id) or is_superadmin());
create policy payments_write on payments for all
  using (is_admin_of(tenant_id) or is_superadmin())
  with check (is_admin_of(tenant_id) or is_superadmin());
