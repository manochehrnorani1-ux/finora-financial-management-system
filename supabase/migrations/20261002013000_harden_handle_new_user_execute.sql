-- Harden the legacy auth trigger function when it exists.
-- FINORA currently uses its own server-side session authentication; the legacy
-- Supabase Auth trigger is removed by the later reconciliation migration.
do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'handle_new_user'
      and pg_get_function_identity_arguments(p.oid) = ''
  ) then
    revoke execute on function public.handle_new_user() from public;
    revoke execute on function public.handle_new_user() from anon;
    revoke execute on function public.handle_new_user() from authenticated;
  end if;
end $$;
