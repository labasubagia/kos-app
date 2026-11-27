-- Expenses: recorded operating costs (utilities, maintenance, etc.)

create type public.expense_category as enum ('water', 'electricity', 'maintenance', 'other');

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  location_id uuid references public.locations (id) on delete set null,
  building_id uuid references public.buildings (id) on delete set null,
  category public.expense_category,
  amount numeric(12,2) not null check (amount > 0),
  date date not null default current_date,
  notes text
);

alter table public.expenses enable row level security;

create policy business_select on public.expenses for select using (public.is_member(tenant_id));
create policy business_insert on public.expenses for insert with check (public.is_member(tenant_id));
create policy business_update on public.expenses for update using (public.is_member(tenant_id));
create policy business_delete on public.expenses for delete using (public.is_member(tenant_id));
