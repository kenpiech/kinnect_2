-- Likes and comments. Both follow the post they belong to: if you can see the
-- post, you can see its likes and comments and add your own; if you can't,
-- they don't exist for you.
--
-- "Can see the post" is written as exists (select 1 from posts ...). That
-- subquery runs as the signed-in user, so the posts read policy ("mine and my
-- friends'") filters it. There's one definition of who sees a post, and likes
-- and comments reuse it instead of repeating the friendship check.

create table public.post_likes (
  post_id    uuid not null references public.posts (id) on delete cascade,
  user_id    text not null default (auth.jwt()->>'sub')
             references public.profiles (user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)  -- one like per person per post
);
create index post_likes_by_user on public.post_likes (user_id);

create table public.post_comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts (id) on delete cascade,
  user_id    text not null default (auth.jwt()->>'sub')
             references public.profiles (user_id) on delete cascade,
  body       text not null check (char_length(btrim(body)) between 1 and 280),
  created_at timestamptz not null default now()
);
create index post_comments_by_post on public.post_comments (post_id, created_at);
create index post_comments_by_user on public.post_comments (user_id);

alter table public.post_likes    enable row level security;
alter table public.post_comments enable row level security;

create policy "kinnect clerk sessions only" on public.post_likes
  as restrictive to authenticated
  using ((select auth.jwt()->>'iss') = 'https://holy-gelding-7096.clerk.accounts.dev');
create policy "kinnect clerk sessions only" on public.post_comments
  as restrictive to authenticated
  using ((select auth.jwt()->>'iss') = 'https://holy-gelding-7096.clerk.accounts.dev');

-- post_likes: see likes on posts you can see; like a post you can see, as
-- yourself; take back only your own like.
create policy "read likes on posts I can see" on public.post_likes
  for select to authenticated
  using (exists (select 1 from public.posts p where p.id = post_likes.post_id));
create policy "like a post I can see" on public.post_likes
  for insert to authenticated
  with check (
    user_id = (select auth.jwt()->>'sub')
    and exists (select 1 from public.posts p where p.id = post_likes.post_id)
  );
create policy "unlike" on public.post_likes
  for delete to authenticated
  using (user_id = (select auth.jwt()->>'sub'));

-- post_comments: the same, except a comment can be deleted by whoever wrote
-- it or by the author of the post it's on (your post, your conversation).
create policy "read comments on posts I can see" on public.post_comments
  for select to authenticated
  using (exists (select 1 from public.posts p where p.id = post_comments.post_id));
create policy "comment on a post I can see" on public.post_comments
  for insert to authenticated
  with check (
    user_id = (select auth.jwt()->>'sub')
    and exists (select 1 from public.posts p where p.id = post_comments.post_id)
  );
create policy "delete my comment, or one on my post" on public.post_comments
  for delete to authenticated
  using (
    user_id = (select auth.jwt()->>'sub')
    or exists (
      select 1 from public.posts p
      where p.id = post_comments.post_id and p.user_id = (select auth.jwt()->>'sub')
    )
  );

-- No updates: likes and comments can be added and removed, never edited.
revoke all on public.post_likes, public.post_comments from anon, authenticated;
grant select, insert, delete on public.post_likes    to authenticated;
grant select, insert, delete on public.post_comments to authenticated;
