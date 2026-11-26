-- RLS policies (per docs/03-data-model.md)

-- Helper: user is a member of tenant
create or replace function public.is_member(t uuid)
returns boolean
language sql stable security definer
as $$
  select exists (
    select 1 from public.memberships m
    where m.tenant_id = t and m.user_id = auth.uid()
  );
$$;

-- Helper: user is an owner of tenant
create or replace function public.is_owner(t uuid)
returns boolean
language sql stable security definer
as $$
  select exists (
    select 1 from public.memberships m
    where m.tenant_id = t and m.user_id = auth.uid() and m.role = 'owner'
  );
$$;

-- tenants: readable by members
alter table public.tenants enable row level security;

create policy tenants_select on public.tenants
  for select using (public.is_member(id));

-- memberships: members read own tenant's memberships; owner manages
alter table public.memberships enable row level security;

create policy memberships_select on public.memberships
  for select using (public.is_member(tenant_id));

create policy memberships_insert on public.memberships
  for insert with check (public.is_owner(tenant_id));

create policy memberships_update on public.memberships
  for update using (public.is_owner(tenant_id));

create policy memberships_delete on public.memberships
  for delete using (public.is_owner(tenant_id));

-- business tables: N policy = tenant membership
create policy business_select on public.rooms   for select using (public.is_member(tenant_id));
create policy business_insert on public.rooms   for insert with check (public.is_member(tenant_id));
create policy business_update on public.rooms   for update using (public.is_member(tenant_id));
create policy business_delete on public.rooms   for delete using (public.is_member(tenant_id));

create policy business_select on public.renters  for select using (public.is_member(tenant_id));
create policy business_insert on public.renters  for insert with check (public.is_member(tenant_id));
create policy business_update on public.renters  for update using (public.is_member(tenant_id));
create policy business_delete on public.renters  for delete using (public.is_member(tenant_id));

create policy business_select on public.contracts for select using (public.is_member(tenant_id));
create policy business_insert on public.contracts for insert with check (public.is_member(tenant_id));
create policy business_update on public.contracts for update using (public.is_member(tenant_id));
create policy business_delete on public.contracts for delete using (public.is_member(tenant_id));

create policy business_select on public.bills     for select using (public.is_member(tenant_id));
create policy business_insert on public.bills     for insert with check (public.is_member(tenant_id));
create policy business_update on public.bills     for update using (public.is_member(tenant_id));
create policy business_delete on public.bills     for delete using (public.is_member(tenant_id));

create policy business_select on public.payments  for select using (public.is_member(tenant_id));
create policy business_insert on public.payments  for insert with check (public.is_member(tenant_id));
create policy business_update on public.payments  for update using (public.is_member(tenant_id));
create policy business_delete on public.payments  for delete using (public.is_member(tenant_id));
