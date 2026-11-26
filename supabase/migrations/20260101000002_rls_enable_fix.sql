-- Corrective: enable RLS on business tables (policies existed but RLS was never enabled)
alter table public.rooms enable row level security;
alter table public.renters enable row level security;
alter table public.contracts enable row level security;
alter table public.bills enable row level security;
alter table public.payments enable row level security;

-- Corrective: add WITH CHECK to UPDATE policies so tenant_id cannot be reassigned cross-tenant
drop policy business_update on public.rooms;
create policy business_update on public.rooms
  for update using (public.is_member(tenant_id)) with check (public.is_member(tenant_id));

drop policy business_update on public.renters;
create policy business_update on public.renters
  for update using (public.is_member(tenant_id)) with check (public.is_member(tenant_id));

drop policy business_update on public.contracts;
create policy business_update on public.contracts
  for update using (public.is_member(tenant_id)) with check (public.is_member(tenant_id));

drop policy business_update on public.bills;
create policy business_update on public.bills
  for update using (public.is_member(tenant_id)) with check (public.is_member(tenant_id));

drop policy business_update on public.payments;
create policy business_update on public.payments
  for update using (public.is_member(tenant_id)) with check (public.is_member(tenant_id));

drop policy memberships_update on public.memberships;
create policy memberships_update on public.memberships
  for update using (public.is_owner(tenant_id)) with check (public.is_owner(tenant_id));
-- P3: enforce bill's contract belongs to same tenant (composite FK)
alter table public.contracts add constraint contracts_id_tenant_unique unique (id, tenant_id);

alter table public.bills drop constraint bills_contract_id_fkey;
alter table public.bills add constraint bills_contract_tenant_fkey
  foreign key (contract_id, tenant_id) references public.contracts (id, tenant_id) on delete cascade;

-- P4: one owner membership per user (DB-level guarantee, race-safe)
create unique index memberships_single_owner_idx
  on public.memberships (user_id)
  where role = 'owner';
