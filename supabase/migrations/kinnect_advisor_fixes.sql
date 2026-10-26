-- Fixes from Supabase's advisors after the first migration.

-- Security: the "Enable automatic RLS" setting created this event-trigger
-- function as SECURITY DEFINER in the public schema, so the Data API offered
-- it to anon and authenticated at /rest/v1/rpc/rls_auto_enable. Nobody needs
-- to call it; the event trigger still runs it.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

-- Performance: the "read my friendships" and "remove a friendship" policies
-- look rows up by requester_id, which had no index of its own.
create index friendships_requester on public.friendships (requester_id);
