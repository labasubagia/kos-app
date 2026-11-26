-- Record a payment against a contract, applied FIFO to oldest unpaid bills.
-- Payment may span multiple bills: one `payments` row per allocated bill share.
-- Rejects overpayment beyond total outstanding balance.

create or replace function public.record_payment(
  p_contract_id uuid,
  p_amount numeric,
  p_method public.payment_method default 'cash',
  p_date date default current_date,
  p_notes text default null
)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_tenant_id uuid;
  v_remaining numeric := p_amount;
  v_bill record;
  v_applied numeric;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if p_amount <= 0 then raise exception 'payment amount must be > 0'; end if;

  select tenant_id into v_tenant_id from public.contracts where id = p_contract_id;
  if v_tenant_id is null then raise exception 'contract not found'; end if;
  if not public.is_member(v_tenant_id) then raise exception 'not a member of this tenant'; end if;

  for v_bill in
    select b.id, b.amount,
           coalesce((select sum(p.amount) from public.payments p where p.bill_id = b.id), 0) as paid
      from public.bills b
     where b.contract_id = p_contract_id and b.status <> 'paid'
     order by b.period, b.due_date
  loop
    exit when v_remaining <= 0;
    v_applied := least(v_remaining, v_bill.amount - v_bill.paid);
    if v_applied <= 0 then continue; end if;

    insert into public.payments (tenant_id, bill_id, date, amount, method, notes)
    values (v_tenant_id, v_bill.id, p_date, v_applied, p_method, p_notes);

    update public.bills
       set status = case
         when (select sum(p.amount) from public.payments p where p.bill_id = v_bill.id)
              + v_applied >= amount then 'paid'
         else 'partial'
       end
     where id = v_bill.id;

    v_remaining := v_remaining - v_applied;
  end loop;

  if v_remaining > 0 then
    raise exception 'overpayment: payment exceeds total outstanding balance by %', v_remaining;
  end if;
end;
$$;

grant execute on function public.record_payment(uuid, numeric, public.payment_method, date, text) to authenticated;
