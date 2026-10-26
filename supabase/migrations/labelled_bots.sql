-- Seven labelled bots, so a new member's feed isn't empty (the user's idea).
--
-- They're the sample characters from Assignment 3, back as real profiles
-- marked with bot_handle (which also picks their drawing in
-- public/avatars/<handle>.svg). You opt in: send one a friend request and it's
-- accepted straight away, and from then on its posts reach your feed through
-- the ordinary posts read policy. No policy changes, so a bot's posts reach
-- only the people who friended it.
--
-- Their 63 posts are released on Assignment 3's timetable by a pg_cron job:
-- day 0 is 2026-10-25 (Chicago time), so the first day's posts are already up,
-- and the rest arrive one by one until 2026-11-07, then the bots go quiet.

-- 1. Bot profiles. Users can't set these columns (no grants), so nobody can
--    make themselves a bot or edit one. Bots never sign in: Clerk IDs start
--    with user_, so bot_ IDs can't collide with a real account.
alter table public.profiles
  add column bot_handle text unique check (bot_handle ~ '^[a-z_]+$'),
  add column bot_bio text check (char_length(bot_bio) <= 200);
grant select (bot_handle, bot_bio) on public.profiles to authenticated;

insert into public.profiles (user_id, display_name, bot_handle, bot_bio) values
  ('bot_bunkerbill', 'Bill Hargrove', 'bunkerbill', 'Prepared, not paranoid. 400 days of rice and counting.'),
  ('bot_tj_linebacker', 'TJ Okafor', 'tj_linebacker', 'Middle linebacker. Six meals a day. Mama''s boy.'),
  ('bot_milemarker', 'Rosa Delgado', 'milemarker', 'Marathoner. Up before the sun, asleep before the news.'),
  ('bot_kant_even', 'Priya Raman', 'kant_even', 'Year five of a philosophy PhD. Thinking about thinking, mostly about deadlines.'),
  ('bot_pipedreams', 'Gus Petrakis', 'pipedreams', 'Licensed plumber, 22 years. Please stop pouring grease down the drain.'),
  ('bot_homefronthannah', 'Hannah Whitfield', 'homefronthannah', 'Mom of three, sourdough starter of one. Running this house like a ship.'),
  ('bot_dm_rolls', 'Marcus Bell', 'dm_rolls', 'Dungeon Master, Thursday nights. Your choices have consequences.');

-- 2. Private schema for the machinery: not exposed through the Data API, and
--    no access for app users.
create schema if not exists kinnect_private;
revoke all on schema kinnect_private from public, anon, authenticated;

-- 3. A friend request to a bot is accepted at once. The requester can't accept
--    it themselves (only the addressee can), so this runs as the table owner.
create function kinnect_private.accept_requests_to_bots()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'pending' and exists (
    select 1 from public.profiles p
    where p.user_id = new.addressee_id and p.bot_handle is not null
  ) then
    update public.friendships set status = 'accepted' where id = new.id;
  end if;
  return null;
end;
$$;
revoke all on function kinnect_private.accept_requests_to_bots() from public, anon, authenticated;

create trigger accept_requests_to_bots
  after insert on public.friendships
  for each row execute function kinnect_private.accept_requests_to_bots();

-- 4. The timetable. Each row becomes a real post when its time comes, dated
--    at its scheduled time.
create table kinnect_private.bot_post_schedule (
  id bigint generated always as identity primary key,
  user_id text not null references public.profiles (user_id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 280),
  publish_at timestamptz not null,
  published boolean not null default false
);
alter table kinnect_private.bot_post_schedule enable row level security;
revoke all on kinnect_private.bot_post_schedule from public, anon, authenticated;

insert into kinnect_private.bot_post_schedule (user_id, body, publish_at)
select user_id, body,
  (timestamp '2026-10-25 00:00' + make_interval(days => day, hours => hour, mins => minute))
    at time zone 'America/Chicago'
from (values
  ('bot_bunkerbill', 'Rotated the canned goods this morning. If it''s dated before 2027 it''s going in tonight''s chili. Waste not.', 0, 6, 3),
  ('bot_bunkerbill', 'Asked @pipedreams how long a 55-gallon drum of water stays good. He said ''Bill, it''s Tuesday.'' Not an answer, Gus.', 0, 19, 20),
  ('bot_bunkerbill', 'Hand-crank radio test: passed. Picked up a farm report and one very confident preacher.', 1, 7, 37),
  ('bot_bunkerbill', 'Power flickered for four seconds tonight. The family did not appreciate the drill I ran afterward.', 2, 20, 4),
  ('bot_bunkerbill', 'Learned to make candles from leftover bacon grease. The house smells like breakfast forever now. Worth it.', 4, 9, 21),
  ('bot_bunkerbill', '@kant_even says preparing for every possible future means living in none of them. I say she''s never been without toilet paper.', 6, 18, 38),
  ('bot_bunkerbill', 'Garden update: the potatoes are winning. The tomatoes have lost the will to live.', 8, 8, 5),
  ('bot_bunkerbill', 'Go-bag is down to 22 pounds. Took out the second can opener. Feels reckless.', 10, 21, 22),
  ('bot_bunkerbill', 'Two weeks of posting on here and the world hasn''t ended. Starting to think you people are a good influence.', 13, 12, 39),
  ('bot_tj_linebacker', 'Film session at 6am. Coach paused on my missed tackle for a full minute. Silence. Pain.', 0, 8, 6),
  ('bot_tj_linebacker', 'Meal four of six: a whole rotisserie chicken and a sweet potato the size of a football. Fitting.', 0, 20, 23),
  ('bot_tj_linebacker', 'Ran stadium stairs with @milemarker. She lapped me twice and wasn''t even breathing hard. Humbling.', 1, 17, 40),
  ('bot_tj_linebacker', 'WIN. 11 tackles, one forced fumble. Mama was in the stands with a sign bigger than she is.', 3, 21, 7),
  ('bot_tj_linebacker', 'Ice bath, then a nap, then a second ice bath. Recovery is a full-time job.', 5, 10, 24),
  ('bot_tj_linebacker', 'Visited @homefronthannah''s son''s peewee practice. Those kids hit harder than some of my teammates.', 7, 16, 41),
  ('bot_tj_linebacker', 'Tried yoga for flexibility. The instructor said ''just relax into it.'' Ma''am, I am 245 pounds.', 9, 19, 8),
  ('bot_tj_linebacker', 'Away game this weekend. Packing three protein shakers and zero sense of direction.', 11, 22, 25),
  ('bot_tj_linebacker', 'Coach said my footwork is ''finally acceptable.'' Framing that quote.', 13, 9, 42),
  ('bot_milemarker', '18 miles before sunrise. Saw two deer, one owl, and a guy in a bathrobe walking a cat.', 0, 5, 9),
  ('bot_milemarker', 'Marathon is 5 weeks out. Taper starts in 2. My legs are already writing angry letters.', 0, 15, 26),
  ('bot_milemarker', 'Easy 5 today. ''Easy'' is a feeling, not a pace.', 1, 6, 43),
  ('bot_milemarker', 'New shoes. Same feet. Somehow I expected otherwise.', 2, 12, 10),
  ('bot_milemarker', 'Rain run. Everyone else stayed in. The trails were all mine and so were the puddles.', 4, 5, 27),
  ('bot_milemarker', '@tj_linebacker wants to run a 5K with me. I told him to bring snacks. He brought a rotisserie chicken.', 5, 18, 44),
  ('bot_milemarker', 'Speedwork: 8 × 800m. Lungs left the chat around repeat six.', 7, 7, 11),
  ('bot_milemarker', 'Longest run of the cycle: 22 miles. Ate a gel that tasted like a scented candle.', 10, 6, 28),
  ('bot_milemarker', 'Bib number came in the mail. 4417. Already decided it''s lucky.', 12, 20, 45),
  ('bot_kant_even', 'Chapter 3 draft is due Friday. Chapter 3 currently consists of a title and a footnote apologizing for the title.', 0, 10, 12),
  ('bot_kant_even', 'If a grad student writes in the library and no one reads the paper, was it peer reviewed?', 0, 23, 29),
  ('bot_kant_even', 'Taught a 9am section on free will. Half the room chose not to attend. Point made.', 1, 14, 46),
  ('bot_kant_even', 'Thursday D&D with @dm_rolls. My wizard spent 40 minutes debating a door''s moral status. Party left without me.', 2, 22, 13),
  ('bot_kant_even', 'My advisor said my argument is ''interesting.'' In academia that''s either praise or a threat.', 4, 11, 30),
  ('bot_kant_even', '@bunkerbill asked me what I''d grab first in an emergency. Honestly? My dissertation backup drive. Then the cat.', 6, 13, 47),
  ('bot_kant_even', 'Wrote 2,000 words today. Deleted 1,800. Progress is a social construct.', 8, 21, 14),
  ('bot_kant_even', 'Chapter 3: submitted. I am a free woman for exactly one week.', 11, 15, 31),
  ('bot_kant_even', 'Reading Montaigne in the park. He also wrote about nothing in particular and got famous for it. There''s hope.', 13, 10, 48),
  ('bot_pipedreams', 'Pulled a whole action figure out of a toilet this morning. Batman. He''d been down there a while.', 0, 7, 15),
  ('bot_pipedreams', 'PSA: the ''flushable'' wipes are not flushable. I have seen things.', 0, 17, 32),
  ('bot_pipedreams', 'Fixed @homefronthannah''s kitchen sink. Got paid in banana bread. Best rate I charge all year.', 1, 12, 49),
  ('bot_pipedreams', 'Water heater install, 7am. Customer had coffee and muffins waiting. Best 7am of my month.', 3, 8, 16),
  ('bot_pipedreams', 'Teaching my nephew to sweat copper pipe. He''s a natural. Didn''t burn anything except my patience.', 5, 19, 33),
  ('bot_pipedreams', '@bunkerbill wants a rainwater catchment system. I said sure. He wants it ''off the books.'' It''s a gutter, Bill.', 6, 9, 50),
  ('bot_pipedreams', 'Cold snap coming. Wrap your outdoor pipes, people. I''d rather not meet you at 2am.', 9, 16, 17),
  ('bot_pipedreams', 'Called a ''small leak.'' Basement was a swimming pool. Small leaks are never small.', 11, 7, 34),
  ('bot_pipedreams', 'Twenty-two years and I still get a kick out of a clean solder joint. Find work you like, folks.', 13, 18, 51),
  ('bot_homefronthannah', 'Sourdough starter is 3 years old today. She''s more reliable than the dishwasher. Happy birthday, Doughlores.', 0, 9, 18),
  ('bot_homefronthannah', 'Carpool, piano, peewee football, and a science fair volcano, all before dinner. Running this house like a ship.', 0, 16, 35),
  ('bot_homefronthannah', 'Gus (@pipedreams) fixed the sink. Paid him in banana bread. Bartering is back and I''m thriving.', 1, 20, 52),
  ('bot_homefronthannah', 'Packed three lunches, found two shoes, lost one child for four minutes (he was in the laundry basket). Normal Tuesday.', 2, 7, 19),
  ('bot_homefronthannah', 'Meal-prepped 21 freezer dinners. @bunkerbill asked if I''m preparing for the apocalypse. No, Bill. Thursdays.', 4, 14, 36),
  ('bot_homefronthannah', 'TJ from the college team came to peewee practice. My son hasn''t stopped talking about it. Neither have I, honestly.', 7, 18, 3),
  ('bot_homefronthannah', 'Reorganized the pantry by color. My husband can''t find anything. I call that a feature.', 9, 10, 20),
  ('bot_homefronthannah', 'Kids asleep. House quiet. Eating the last slice of banana bread in the dark like a raccoon.', 11, 21, 37),
  ('bot_homefronthannah', 'Science fair update: the volcano won second place. The baking soda budget won first.', 13, 8, 4),
  ('bot_dm_rolls', 'Session 47 prep: 12 pages of notes. The party will ignore all of it and befriend a goat.', 0, 11, 21),
  ('bot_dm_rolls', 'Rolled a natural 20 on behalf of the dragon. Felt bad. Did not reroll.', 0, 22, 38),
  ('bot_dm_rolls', 'New rule at my table: if you argue with the rulebook, you have to read the rulebook out loud. Silence fell.', 1, 19, 5),
  ('bot_dm_rolls', '@kant_even''s wizard just convinced a lich that death is a social construct. I need a minute.', 3, 23, 22),
  ('bot_dm_rolls', 'Painted 14 goblin miniatures over lunch. They''ll die in one fireball. That''s the circle of life.', 5, 12, 39),
  ('bot_dm_rolls', 'The party finally met the goat again. They made him mayor. I''m rewriting the whole campaign.', 7, 22, 6),
  ('bot_dm_rolls', 'Asked @bunkerbill to play a session. He brought his own 72-hour kit to the table. Respect.', 8, 17, 23),
  ('bot_dm_rolls', 'Session 48: zero combat, three hours of bargaining at a cheese market. Best session yet.', 10, 20, 40),
  ('bot_dm_rolls', 'Mayor Goat has passed his first law. It''s about cheese. Of course it''s about cheese.', 12, 22, 7)
) as t(user_id, body, day, hour, minute);

create function kinnect_private.publish_due_bot_posts()
returns integer
language plpgsql
set search_path = ''
as $$
declare
  published_count integer;
begin
  with due as (
    select id, user_id, body, publish_at
    from kinnect_private.bot_post_schedule
    where not published and publish_at <= now()
    for update skip locked
  ), posted as (
    insert into public.posts (user_id, body, created_at)
    select user_id, body, publish_at from due
  )
  update kinnect_private.bot_post_schedule s
  set published = true
  from due
  where s.id = due.id;
  get diagnostics published_count = row_count;
  return published_count;
end;
$$;
revoke all on function kinnect_private.publish_due_bot_posts() from public, anon, authenticated;

-- 5. Check every 10 minutes, and publish the backlog now.
create extension if not exists pg_cron;
select cron.schedule('publish-bot-posts', '*/10 * * * *', 'select kinnect_private.publish_due_bot_posts()');
select kinnect_private.publish_due_bot_posts();
