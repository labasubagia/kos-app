-- Contract lifecycle RPCs: enforce invariants atomically in Postgres.
-- check-in: room must be 'available'; insert active contract; room -> 'occupied'.
-- extend: only on active contract; end_date must advance.
-- check-out: close active contract (active=false); room -> 'available';
--   return deposit refund = deposit - arrears - deductions (>= 0);
--   arrears = outstanding balance of unpaid bills on the contract.

create or replace function public.check_in_contract(
  p_renter_id uuid,
  p_room_id uuid,
  p_start_date date,
  p_end_date date,
  p_monthly_rent numeric,
  p_deposit numeric default 0,
  p_due_day int default 1,
  p_grace_days int default 0,
  p_late_fee_per_period numeric default 0
)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_tenant_id uuid;
  v_room_status public.room_status;
  v_contract_id uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;

  select tenant_id into v_tenant_id from public.rooms where id = p_room_id;
  if v_tenant_id is null then raise exception 'room not found'; end if;
  if not public.is_member(v_tenant_id) then raise exception 'not a member of this tenant'; end if;

  select status into v_room_status from public.rooms where id = p_room_id;
  if v_room_status <> 'available' then raise exception 'room is not available'; end if;

  if p_start_date is null then raise exception 'start date required'; end if;
  if p_end_date is not null and p_end_date <= p_start_date then
    raise exception 'end date must be after start date';
  end if;
  if p_monthly_rent < 0 then raise exception 'monthly rent cannot be negative'; end if;
  if p_deposit < 0 then raise exception 'deposit cannot be negative'; end if;
  if p_due_day not between 1 and 31 then raise exception 'due day must be 1-31'; end if;

  insert into public.contracts (
    tenant_id, renter_id, room_id, start_date, end_date,
    monthly_rent, deposit, due_day, grace_days, late_fee_per_period
  ) values (
    v_tenant_id, p_renter_id, p_room_id, p_start_date, p_end_date,
    p_monthly_rent, p_deposit, p_due_day, p_grace_days, p_late_fee_per_period
  ) returning id into v_contract_id;

  update public.rooms set status = 'occupied' where id = p_room_id;
  return v_contract_id;
end;
$$;

create or replace function public.extend_contract(p_contract_id uuid, p_new_end_date date)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_tenant_id uuid;
  v_active boolean;
  v_end_date date;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select tenant_id, active, end_date into v_tenant_id, v_active, v_end_date
    from public.contracts where id = p_contract_id;
  if v_tenant_id is null then raise exception 'contract not found'; end if;
  if not public.is_member(v_tenant_id) then raise exception 'not a member of this tenant'; end if;
  if not v_active then raise exception 'contract is closed'; end if;
  if p_new_end_date is null or p_new_end_date <= v_end_date then
    raise exception 'new end date must be after current end date';
  end if;
  update public.contracts set end_date = p_new_end_date where id = p_contract_id;
end;
$$;

create or replace function public.check_out_contract(p_contract_id uuid, p_deductions numeric default 0)
returns numeric
language plpgsql security definer
set search_path = public
as $$
declare
  v_tenant_id uuid;
  v_active boolean;
  v_room_id uuid;
  v_deposit numeric;
  v_arrears numeric;
  v_refund numeric;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;

  select tenant_id, active, room_id, deposit into v_tenant_id, v_active, v_room_id, v_deposit
    from public.contracts where id = p_contract_id;
  if v_tenant_id is null then raise exception 'contract not found'; end if;
  if not public.is_member(v_tenant_id) then raise exception 'not a member of this tenant'; end if;
  if not v_active then raise exception 'contract already closed'; end if;
  if p_deductions < 0 then raise exception 'deductions cannot be negative'; end if;

  select coalesce(sum(b.amount - coalesce(
    (select sum(p.amount) from public.payments p where p.bill_id = b.id), 0)), 0)
    into v_arrears
    from public.bills b
    where b.contract_id = p_contract_id and b.status <> 'paid';

  v_refund := greatest(0, v_deposit - v_arrears - p_deductions);

  update public.contracts set active = false, end_date = coalesce(end_date, current_date)
    where id = p_contract_id;
  update public.rooms set status = 'available' where id = v_room_id;

  return v_refund;
end;
$$;

grant execute on function public.check_in_contract(uuid, uuid, date, date, numeric, numeric, int, int, numeric) to authenticated;
grant execute on function public.extend_contract(uuid, date) to authenticated;
grant execute on function public.check_out_contract(uuid, numeric) to authenticated;
