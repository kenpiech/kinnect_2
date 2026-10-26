-- Reading status for books in your library, and the book's cover on posts.

-- Where you are with each book. Saved books start as "want to read". Like the
-- rest of your library, it's private.
alter table public.library_items
  add column status text not null default 'want'
  check (status in ('want', 'reading', 'finished'));

-- Changing a status is the first update on library_items, so it needs a policy
-- and a grant. Only the status column can be updated: a book's title, author
-- and owner never change after saving.
create policy "update my library" on public.library_items
  for update to authenticated
  using (user_id = (select auth.jwt()->>'sub'))
  with check (user_id = (select auth.jwt()->>'sub'));
grant update (status) on public.library_items to authenticated;

-- A post copies its book's cover too, so a friend who saves the book from
-- your post gets the cover in their library. Older posts have none.
alter table public.posts
  add column book_cover_id integer check (book_cover_id > 0);
