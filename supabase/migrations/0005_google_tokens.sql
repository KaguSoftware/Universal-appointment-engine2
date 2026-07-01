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
