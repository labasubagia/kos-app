-- Allow owner to update tenant (workspace name)
create policy tenants_update on public.tenants
  for update using (public.is_owner(id))
  with check (public.is_owner(id));