-- Member management RPCs (issue #12)
-- invite_member: owner-only, security definer (auth.users not readable by anon)
-- tenant_members: list members + emails for the tenant (owner/member readable)

create or replace function public.invite_member(p_email text)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  tid uuid;
  invited uuid;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  select m.tenant_id into tid from public.memberships m where m.user_id = uid;
  if tid is null then
    raise exception 'user is not a member of any tenant';
  end if;

  if not public.is_owner(tid) then
    raise exception 'only the owner can invite members';
  end if;

  select u.id into invited from auth.users u where lower(u.email) = lower(p_email);
  if invited is null then
    raise exception 'no account found for that email';
  end if;

  if exists (select 1 from public.memberships m where m.user_id = invited and m.tenant_id = tid) then
    raise exception 'user is already a member of this tenant';
  end if;

  insert into public.memberships (user_id, tenant_id, role)
  values (invited, tid, 'admin');

  return invited;
end;
$$;

create or replace function public.tenant_members(p_tenant uuid)
returns table (user_id uuid, email text, role public.role_type)
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

grant execute on function public.invite_member(text) to authenticated;
grant execute on function public.tenant_members(uuid) to authenticated;
