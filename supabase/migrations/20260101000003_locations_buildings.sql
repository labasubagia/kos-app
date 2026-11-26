-- Hierarchy: tenant → location → building → room

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name varchar(255) not null,
  unique (tenant_id, name)
);

create table public.buildings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  location_id uuid not null references public.locations (id) on delete cascade,
  name varchar(100) not null,
  unique (location_id, name)
);

-- rooms: replace text column with FK to buildings
alter table public.rooms drop constraint rooms_tenant_id_name_key;
alter table public.rooms add column building_id uuid not null references public.buildings (id) on delete restrict;
alter table public.rooms add constraint rooms_building_id_name_key unique (building_id, name);

-- RLS for locations/buildings (same membership policy as business tables)
alter table public.locations enable row level security;
alter table public.buildings enable row level security;

create policy locations_select on public.locations for select using (public.is_member(tenant_id));
create policy locations_insert on public.locations for insert with check (public.is_member(tenant_id));
create policy locations_update on public.locations for update using (public.is_member(tenant_id));
create policy locations_delete on public.locations for delete using (public.is_member(tenant_id));

create policy buildings_select on public.buildings for select using (public.is_member(tenant_id));
create policy buildings_insert on public.buildings for insert with check (public.is_member(tenant_id));
create policy buildings_update on public.buildings for update using (public.is_member(tenant_id));
create policy buildings_delete on public.buildings for delete using (public.is_member(tenant_id));
