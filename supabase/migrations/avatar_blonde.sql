-- A 13th avatar, "blonde". The check on profiles.avatar lists every drawing,
-- so a new drawing means a new list.
alter table public.profiles drop constraint profiles_avatar_check;
alter table public.profiles add constraint profiles_avatar_check
  check (avatar in ('specs', 'bun', 'curls', 'beanie', 'beard', 'bob', 'hijab',
                    'silver', 'braids', 'headphones', 'freckles', 'blonde', 'cap'));
