-- This trigger function is only meant to run from auth.users' insert trigger.
-- It is SECURITY DEFINER and must not be exposed as an RPC to API roles.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
