-- DELIBERATELY BREAKS kinnect's privacy, for the Playwright demo only.
-- Loosens "read mine and my friends' posts" so every signed-in kinnect user can
-- read every post. Run it, run `npm run test:e2e` (it should FAIL: Reader B
-- sees Reader A's post), then run restore.sql straight away.
alter policy "read mine and my friends' posts" on public.posts
  using (true);
