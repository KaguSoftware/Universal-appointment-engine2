-- Service categories + presentation fields.
--
-- The services tab is a flat, undifferentiated list. Real menus group services
-- ("Haircuts", "Color", "Treatments"), show an image, and control ordering.
-- This adds a tenant-scoped category table and the presentation columns.

create table service_categories (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  name        text not null,
  sort        int not null default 0,
  created_at  timestamptz not null default now()
);
create index on service_categories (tenant_id);

alter table services
  add column category_id uuid references service_categories(id) on delete set null,
  add column image_url   text,
  add column sort        int not null default 0;
create index on services (category_id);

-- ---------------------------------------------------------------------------
-- RLS: members read, admins write (mirrors services).
-- ---------------------------------------------------------------------------
alter table service_categories enable row level security;

create policy service_categories_read on service_categories for select
  using (is_member_of(tenant_id) or is_superadmin());
create policy service_categories_write on service_categories for all
  using (is_admin_of(tenant_id) or is_superadmin())
  with check (is_admin_of(tenant_id) or is_superadmin());

-- Public booking needs to read categories to group the menu. Expose via RPC
-- (consistent with public_list_services) rather than granting table SELECT.
create or replace function public_list_service_categories(p_tenant uuid)
returns setof service_categories
language sql stable security definer set search_path = public as $$
  select * from service_categories
  where tenant_id = p_tenant
  order by sort, name;
$$;

grant execute on function public_list_service_categories(uuid) to anon, authenticated;
