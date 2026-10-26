-- Puts the posts read policy back exactly as supabase/migrations/kinnect_schema.sql
-- defines it: your own posts, plus posts by people you have an accepted
-- friendship with, in either direction.
alter policy "read mine and my friends' posts" on public.posts
  using (
    user_id = (select auth.jwt()->>'sub')
    or exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and (
          (f.requester_id = (select auth.jwt()->>'sub') and f.addressee_id = posts.user_id)
          or (f.addressee_id = (select auth.jwt()->>'sub') and f.requester_id = posts.user_id)
        )
    )
  );
