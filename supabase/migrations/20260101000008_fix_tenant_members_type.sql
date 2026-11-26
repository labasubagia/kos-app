-- Fix tenant_members return type: auth.users.email is varchar(255), not text.
-- PostgREST rejects result when declared type mismatches actual column type.

drop function if exists public.tenant_members(uuid);

create or replace function public.tenant_members(p_tenant uuid)
returns table (user_id uuid, email varchar(255), role public.role_type)
language plpgsql security definer
set search_path = public
as $$
begin
  if not public.is_member(p_tenant) then
    raise exception 'access denied';
  end if;

  return query
    select m.user_id, u.email, m.role
    from public.memberships m
    join auth.users u on u.id = m.user_id
    where m.tenant_id = p_tenant
    order by m.created_at;
end;
$$;

grant execute on function public.tenant_members(uuid) to authenticated;
