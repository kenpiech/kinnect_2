-- Kinnect v2 schema: four tables, row-level security on every one.
-- The rule everything follows: your library is private, and your posts are
-- shared with your friends.
--
-- "me" below is (select auth.jwt()->>'sub'): the Clerk user ID from the
-- session token. Wrapping it in a select lets Postgres work it out once per
-- query instead of once per row.

-- Tables ---------------------------------------------------------------------

create table public.profiles (
  user_id      text primary key default (auth.jwt()->>'sub'),
  display_name text not null check (char_length(btrim(display_name)) between 1 and 80),
  created_at   timestamptz not null default now()
);

create table public.library_items (
  id       uuid primary key default gen_random_uuid(),
  user_id  text not null default (auth.jwt()->>'sub')
           references public.profiles (user_id) on delete cascade,
  ol_key   text not null check (ol_key ~ '^/works/OL[0-9]+W$'),
  title    text not null check (char_length(title) between 1 and 500),
  author   text check (char_length(author) <= 300),  -- some works list no author
  cover_id integer,                                  -- missing for many works
  year     smallint,                                 -- sometimes missing or wrong
  added_at timestamptz not null default now(),
  unique (user_id, ol_key)
);

create table public.friendships (
  id           uuid primary key default gen_random_uuid(),
  requester_id text not null default (auth.jwt()->>'sub')
               references public.profiles (user_id) on delete cascade,
  addressee_id text not null
               references public.profiles (user_id) on delete cascade,
  status       text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at   timestamptz not null default now(),
  check (requester_id <> addressee_id)
);

-- One row per pair of people, whichever of them asked first
create unique index friendships_one_per_pair
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index friendships_addressee on public.friendships (addressee_id);

create table public.posts (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null default (auth.jwt()->>'sub')
              references public.profiles (user_id) on delete cascade,
  body        text not null check (char_length(btrim(body)) between 1 and 280),
  -- A copy of the book, not a link to library_items: friends can't read
  -- your library, so a link would show up broken for them
  book_ol_key text check (book_ol_key ~ '^/works/OL[0-9]+W$'),
  book_title  text check (char_length(book_title) <= 500),
  book_author text check (char_length(book_author) <= 300),
  created_at  timestamptz not null default now(),
  check ((book_ol_key is null) = (book_title is null))
);
create index posts_by_author on public.posts (user_id, created_at desc);

-- Row-level security ---------------------------------------------------------
-- Supabase also turns RLS on automatically for new tables; saying so here
-- keeps the migration correct on its own.

alter table public.profiles      enable row level security;
alter table public.library_items enable row level security;
alter table public.friendships   enable row level security;
alter table public.posts         enable row level security;

-- Only tokens from Kinnect's Clerk instance count. Supabase also trusts its
-- own built-in sign-in, so without this anyone holding the publishable key
-- could create a Supabase account, skip Clerk, and act as "authenticated".
-- Restrictive policies must pass in addition to the permissive ones below.
create policy "kinnect clerk sessions only" on public.profiles
  as restrictive to authenticated
  using ((select auth.jwt()->>'iss') = 'https://holy-gelding-7096.clerk.accounts.dev');
create policy "kinnect clerk sessions only" on public.library_items
  as restrictive to authenticated
  using ((select auth.jwt()->>'iss') = 'https://holy-gelding-7096.clerk.accounts.dev');
create policy "kinnect clerk sessions only" on public.friendships
  as restrictive to authenticated
  using ((select auth.jwt()->>'iss') = 'https://holy-gelding-7096.clerk.accounts.dev');
create policy "kinnect clerk sessions only" on public.posts
  as restrictive to authenticated
  using ((select auth.jwt()->>'iss') = 'https://holy-gelding-7096.clerk.accounts.dev');

-- profiles: anyone signed in can read names (People needs them); you can only
-- create and rename your own.
create policy "signed-in users read profiles" on public.profiles
  for select to authenticated
  using ((select auth.jwt()->>'sub') is not null);
create policy "create my profile" on public.profiles
  for insert to authenticated
  with check (user_id = (select auth.jwt()->>'sub'));
create policy "rename my profile" on public.profiles
  for update to authenticated
  using (user_id = (select auth.jwt()->>'sub'))
  with check (user_id = (select auth.jwt()->>'sub'));

-- library_items: yours alone, even friends can't read it.
create policy "read my library" on public.library_items
  for select to authenticated
  using (user_id = (select auth.jwt()->>'sub'));
create policy "add to my library" on public.library_items
  for insert to authenticated
  with check (user_id = (select auth.jwt()->>'sub'));
create policy "remove from my library" on public.library_items
  for delete to authenticated
  using (user_id = (select auth.jwt()->>'sub'));

-- friendships: both people see the row; only the requester can create it, as
-- pending; only the addressee can accept; either can remove it.
create policy "read my friendships" on public.friendships
  for select to authenticated
  using ((select auth.jwt()->>'sub') in (requester_id, addressee_id));
create policy "send a friend request" on public.friendships
  for insert to authenticated
  with check (requester_id = (select auth.jwt()->>'sub') and status = 'pending');
create policy "accept a request sent to me" on public.friendships
  for update to authenticated
  using (addressee_id = (select auth.jwt()->>'sub') and status = 'pending')
  with check (addressee_id = (select auth.jwt()->>'sub') and status = 'accepted');
create policy "remove a friendship" on public.friendships
  for delete to authenticated
  using ((select auth.jwt()->>'sub') in (requester_id, addressee_id));

-- posts: you see your own, plus posts by people you have an accepted
-- friendship with, in either direction.
create policy "read mine and my friends' posts" on public.posts
  for select to authenticated
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
create policy "write my posts" on public.posts
  for insert to authenticated
  with check (user_id = (select auth.jwt()->>'sub'));
create policy "delete my posts" on public.posts
  for delete to authenticated
  using (user_id = (select auth.jwt()->>'sub'));

-- Grants ---------------------------------------------------------------------
-- "Automatically expose new tables" is off, so tables start with no access.
-- Signed-in users get only what the app needs; anon (signed out) gets nothing.
-- Updates are limited to single columns: otherwise accepting a request could
-- also rewrite requester_id and forge a friendship with someone else.

revoke all on public.profiles, public.library_items, public.friendships, public.posts
  from anon, authenticated;

grant select, insert           on public.profiles      to authenticated;
grant update (display_name)    on public.profiles      to authenticated;
grant select, insert, delete   on public.library_items to authenticated;
grant select, insert, delete   on public.friendships   to authenticated;
grant update (status)          on public.friendships   to authenticated;
grant select, insert, delete   on public.posts         to authenticated;
