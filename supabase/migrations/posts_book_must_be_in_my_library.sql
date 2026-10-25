-- A post's book must be a copy of a book in the author's own library.
--
-- createPost already copies the book from your library on the server, but
-- the browser holds a session token and Supabase's publishable key, so
-- someone could insert a post straight through the Data API with any title,
-- author or cover on a real Open Library key. Since "Save book" copies a
-- post's book into a friend's private library, a forged one would spread.
-- Now the database itself insists the copy matches your library row exactly.

-- alter, not drop and create: the change is atomic, with no moment where
-- posts has no insert policy
alter policy "write my posts" on public.posts
  with check (
    user_id = (select auth.jwt()->>'sub')
    and (
      -- No book: then no stray book details either
      (book_ol_key is null and book_author is null and book_cover_id is null)
      or exists (
        select 1 from public.library_items l
        where l.user_id = (select auth.jwt()->>'sub')
          and l.ol_key = posts.book_ol_key
          and l.title = posts.book_title
          and l.author is not distinct from posts.book_author
          and l.cover_id is not distinct from posts.book_cover_id
      )
    )
  );
