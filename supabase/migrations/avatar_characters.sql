-- Six character avatars: ninja, wizard, viking, detective, pilot and a polar
-- bear. The check on profiles.avatar lists every drawing.
alter table public.profiles drop constraint profiles_avatar_check;
alter table public.profiles add constraint profiles_avatar_check
  check (avatar in ('specs', 'bun', 'curls', 'beanie', 'beard', 'bob', 'hijab',
                    'silver', 'braids', 'headphones', 'freckles', 'blonde', 'cap',
                    'ninja', 'wizard', 'viking', 'detective', 'pilot', 'polarbear'));
