-- Posts and comments: insert only the columns the app sends (found in the
-- security review).
--
-- A table-wide insert grant let anyone using the Data API directly set
-- created_at themselves, e.g. to the year 2099, pinning a post to the top of
-- every friend's newest-first feed, or a comment to the end. id and user_id
-- were insertable too (user_id was still checked by the policies). Now those
-- columns always take their defaults: a fresh id, the session's user, and now().
-- Likes, friendships and library rows only order things for yourself, or
-- not at all, so they keep their table-wide grants.

revoke insert on public.posts from authenticated;
grant insert (body, book_ol_key, book_title, book_author, book_cover_id) on public.posts to authenticated;

revoke insert on public.post_comments from authenticated;
grant insert (post_id, body) on public.post_comments to authenticated;
