-- Enable required extensions
create extension if not exists "pgcrypto";

-- Role enum for memberships
create type public.role_type as enum ('owner', 'admin');

-- Room type
create type public.room_type as enum ('regular', 'vip');

-- Room status
create type public.room_status as enum ('available', 'reserved', 'occupied', 'maintenance');

-- Bill status
create type public.bill_status as enum ('unpaid', 'partial', 'paid');

-- Payment method
create type public.payment_method as enum ('cash', 'transfer');

-- tenants: one data unit per owner
create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name varchar(255) not null,
  created_at timestamptz not null default now()
);

-- memberships: user <-> tenant link + role
create table public.memberships (
  user_id uuid not null references auth.users (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  role public.role_type not null default 'admin',
  created_at timestamptz not null default now(),
  primary key (user_id, tenant_id)
);

-- rooms
create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name varchar(100) not null,
  type public.room_type not null default 'regular',
  capacity int not null default 1 check (capacity > 0),
  monthly_rent numeric(12,2) not null check (monthly_rent >= 0),
  status public.room_status not null default 'available',
  unique (tenant_id, name)
);

-- renters
create table public.renters (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name varchar(255) not null,
  phone varchar(20) not null,
  email varchar(255),
  nik varchar(30),
  notes text
);

-- contracts
create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  renter_id uuid not null references public.renters (id) on delete restrict,
  room_id uuid not null references public.rooms (id) on delete restrict,
  start_date date not null,
  end_date date,
  monthly_rent numeric(12,2) not null check (monthly_rent >= 0),
  deposit numeric(12,2) not null default 0 check (deposit >= 0),
  due_day int not null default 1 check (due_day between 1 and 31),
  grace_days int not null default 0 check (grace_days >= 0),
  late_fee_per_period numeric(12,2) not null default 0 check (late_fee_per_period >= 0),
  active boolean not null default true,
  check (end_date is null or end_date > start_date)
);

-- 1-active-contract invariant per room
create unique index contracts_single_active_idx
  on public.contracts (room_id, tenant_id)
  where active;

-- bills
create table public.bills (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  contract_id uuid not null references public.contracts (id) on delete cascade,
  period varchar(7) not null, -- YYYY-MM
  amount numeric(12,2) not null check (amount >= 0),
  due_date date not null,
  status public.bill_status not null default 'unpaid',
  unique (contract_id, period)
);

-- payments
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  bill_id uuid not null references public.bills (id) on delete cascade,
  date date not null default current_date,
  amount numeric(12,2) not null check (amount > 0),
  method public.payment_method not null default 'cash',
  notes text
);
-- Bootstrap: first user creates their tenant + owner membership (RPC, security definer)
create or replace function public.create_tenant_as_owner(tenant_name text)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  tid uuid;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  -- a user may only own one tenant
  if exists (select 1 from public.memberships m where m.user_id = uid) then
    raise exception 'user already belongs to a tenant';
  end if;
  insert into public.tenants (name) values (tenant_name) returning id into tid;
  insert into public.memberships (user_id, tenant_id, role) values (uid, tid, 'owner');
  return tid;
end;
$$;

grant execute on function public.create_tenant_as_owner(text) to authenticated;
