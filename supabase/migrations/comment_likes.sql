-- Likes on comments (the user's idea). Same shape as post_likes, one level
-- down: if you can see the comment, you can see its likes and add your own.
--
-- "Can see the comment" is exists (select 1 from post_comments ...), which
-- runs under the comments read policy, which in turn reuses the posts read
-- policy. So who sees a comment like is still defined in one place.

create table public.comment_likes (
  comment_id uuid not null references public.post_comments (id) on delete cascade,
  user_id    text not null default (auth.jwt()->>'sub')
             references public.profiles (user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)  -- one like per person per comment
);
create index comment_likes_by_user on public.comment_likes (user_id);

alter table public.comment_likes enable row level security;

create policy "kinnect clerk sessions only" on public.comment_likes
  as restrictive to authenticated
  using ((select auth.jwt()->>'iss') = 'https://holy-gelding-7096.clerk.accounts.dev');

create policy "read likes on comments I can see" on public.comment_likes
  for select to authenticated
  using (exists (select 1 from public.post_comments c where c.id = comment_likes.comment_id));
create policy "like a comment I can see" on public.comment_likes
  for insert to authenticated
  with check (
    user_id = (select auth.jwt()->>'sub')
    and exists (select 1 from public.post_comments c where c.id = comment_likes.comment_id)
  );
create policy "unlike a comment" on public.comment_likes
  for delete to authenticated
  using (user_id = (select auth.jwt()->>'sub'));

-- No updates. Inserts name only the comment: who and when take their defaults.
revoke all on public.comment_likes from anon, authenticated;
grant select, delete on public.comment_likes to authenticated;
grant insert (comment_id) on public.comment_likes to authenticated;
