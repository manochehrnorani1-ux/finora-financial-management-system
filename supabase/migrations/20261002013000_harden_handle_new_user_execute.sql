-- Harden the auth trigger function so it cannot be invoked directly
-- by API roles. The trigger itself continues to execute the function.
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;
