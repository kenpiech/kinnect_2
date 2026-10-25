-- Each person picks one of lib2's 12 drawn avatars (public/avatars/readers).
-- Null until they pick; the app asks before anything else. The check keeps
-- the column to names that have a drawing, so a crafted request can't point
-- it at anything else.
alter table public.profiles
  add column avatar text
  check (avatar in ('specs', 'bun', 'curls', 'beanie', 'beard', 'bob',
                    'hijab', 'silver', 'braids', 'headphones', 'freckles', 'cap'));

-- Updates stay limited to single columns, and the "rename my profile" policy
-- already limits them to your own row
grant update (avatar) on public.profiles to authenticated;
