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
