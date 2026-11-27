-- Restrict bill generation to periods within the contract's stay window.
-- Prevents creating bills for months before move-in or after check-out
-- (e.g. a tenant who left last year should not get a bill for their month).
-- Behavior otherwise identical: idempotent via unique (contract_id, period).

create or replace function public.generate_bills(p_period text default to_char(now(), 'YYYY-MM'), p_contract_id uuid default null)
returns int
language plpgsql security definer
set search_path = public
as $$
declare
  v_created int := 0;
  v_contract record;
  v_amount numeric;
  v_late boolean;
  v_prior_period text;
  v_due_date date;
begin
  if p_period !~ '^\d{4}-\d{2}$' then raise exception 'invalid period'; end if;

  v_prior_period := to_char(
    (to_date(p_period || '-01', 'YYYY-MM-DD') - interval '1 month'),
    'YYYY-MM');
  v_due_date := to_date(p_period || '-01', 'YYYY-MM-DD') + interval '1 month' - interval '1 day';

  for v_contract in
    select c.id as contract_id, c.monthly_rent, c.late_fee_per_period, c.grace_days,
           c.due_day
      from public.contracts c
     where c.active
       and (p_contract_id is null or c.id = p_contract_id)
        and p_period between to_char(c.start_date, 'YYYY-MM')
                         and coalesce(to_char(c.end_date, 'YYYY-MM'), '9999-12')
  loop
    v_late := exists (
      select 1
        from public.bills b
       where b.contract_id = v_contract.contract_id
         and b.period = v_prior_period
         and b.status <> 'paid'
         and (current_date - b.due_date) > v_contract.grace_days
    );
    v_amount := v_contract.monthly_rent + case when v_late then v_contract.late_fee_per_period else 0 end;

    insert into public.bills (tenant_id, contract_id, period, amount, due_date)
    select c.tenant_id, c.id, p_period, v_amount, v_due_date
      from public.contracts c
     where c.id = v_contract.contract_id
    on conflict (contract_id, period) do nothing;

    if found then v_created := v_created + 1; end if;
  end loop;

  return v_created;
end;
$$;
