<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# kinnect

**A social app with a reading tool, not a reading app with social features.** A small social network for classmates: add friends, post, like and comment, and keep a private library of books you can mention in a post. Always written in lowercase, **kinnect**, even at the start of a sentence or in a title. Copy leads with the social side; books are the built-in tool. Live at **https://lib-2-app.vercel.app** (the address is from when the app was briefly called "lib2"; Vercel production tracks `full-stack` until the merge, then `main`). Version 2 of Assignment 3's kinnect (a localStorage-only prototype). The repo is `kinnect_2`. Browser keys are `kinnect:draft` and `kinnect:flash`. The test readers' emails still say `lib2-`, because they're existing Clerk accounts.

**The rule everything follows: your posts are shared with your friends, and your library is private.**

## Stack
- Next.js 16 and Tailwind CSS
- **Clerk** for accounts (development keys only)
- **Supabase** (Postgres) for data, connected to Clerk through Supabase third-party auth
- **Open Library** for book search (no key)
- Deployed on Vercel's Hobby plan at `lib-2-app.vercel.app` (passkeys only work on that address)

## Product facts
- **Real friends only.** Friends are other signed-up users. A friendship starts as a request and counts only once the other person accepts. Three A3 characters (`public/avatars/`) appear **only** as three labelled sample posts on the signed-out landing page (`/`, data in `src/data/samples.ts`), never as users or friends. Signed-in visitors to `/` are sent to `/feed` by `src/proxy.ts`.
- **Passwordless sign-in.** Clerk has passwords turned off. You sign up with your name and email plus an emailed 6-digit code, and then add a **passkey** (Face ID, Touch ID or a fingerprint). After that, you sign in with the passkey, and the email code is the fallback. `src/components/PasskeyPrompt.tsx` offers the passkey to every signed-in user who doesn't have one ("Not now" hides it for that visit only). The sign-in page leads with a big "Sign in with passkey" button (`src/components/PasskeySignIn.tsx`), with Clerk's email-code form below. Clerk settings are changed with `clerk config patch` (always `--dry-run` first) and recorded in `learning.md`.
- **Signed out, you see nothing real.** Every route except `/` and the Clerk sign-in/sign-up pages requires a session. Signed-out pages redirect to sign-in, and `/api/*` answers `401` JSON (from `src/proxy.ts`, and checked again in each handler).
- **Library tab:** search Open Library and save books, each marked **Want to read** (the default), **Reading** or **Finished**, with a filter by status. Your library and your statuses are private, even from friends.
- **Save from a post:** a post about a book shows "Save book" (or "In your library" if you have it). The server copies the book from the post, so you can only save a book from a post you're allowed to see.
- **People tab:** list and search other users. Request, Accept and Remove (Remove also covers decline, cancel and unfriend). An **Invite a classmate** button opens the phone's share sheet, or copies the link (`src/components/InviteButton.tsx`). The People tab shows a **badge** with the number of requests waiting on you (`getPendingRequestCount`, streamed into the nav from the layout as a promise; it updates on any `refresh()` or page load).
- **A person's page** (`/people/[userId]`): their avatar and name, how you're connected, the friend buttons (`PersonActions`), and their posts, which the database returns only to friends. The page shows whatever posts come back; the friendship status only picks the empty message. Names and avatars on posts, comments and People link here (your own link to Me).
- **Posts** ("What's on your mind?"): up to 280 characters, optionally about one book from your library. Your feed shows your posts and your accepted friends' posts, newest first.
- **Likes and comments** (`src/components/PostFooter.tsx`): one like per person per post (optimistic heart), and comments up to 280 characters, oldest first. You can delete your own comment, and a post's author can delete any comment on it. A comment is visible to everyone who can see the post, and the comment box says so.
- **Tabs:** Feed · Library · People · Me.
- **Avatars are required.** Everyone picks one of 19 drawn avatars (13 readers plus a ninja, wizard, viking, detective, pilot and polar bear) (`public/avatars/readers`, drawn by `scripts/reader_avatars.py`; keys in `src/lib/avatars.ts` and the `profiles.avatar` check). Until they do, `ProfileSync` shows `AvatarGate`, a modal `<dialog>` that Escape can't close. They can change it on Me. Avatars show on posts, People and Me. Initials are only a fallback.

## Data model
Six tables in Supabase. Every ID that names a person is a **Clerk user ID** (`text`), and columns that record "who did this" default to `auth.jwt()->>'sub'`. Below, **me** means `auth.jwt()->>'sub'`.

| Table | Columns | Who can do what (RLS) |
|---|---|---|
| `profiles` | `user_id` text PK, `display_name` text, `avatar` (one of 19 keys, null until picked), `created_at` | **read:** any signed-in user (People needs names). **insert/update:** own row only (`display_name` and `avatar` columns). |
| `library_items` | `id`, `user_id`, `ol_key` (e.g. `/works/OL27482W`), `title`, `author`, `cover_id` and `year` (all three nullable), `status` (`want`, `reading` or `finished`; default `want`), `added_at`; unique (`user_id`, `ol_key`) | **read/insert/delete:** own rows only. **update:** own rows, `status` column only. Private, even from friends. |
| `friendships` | `id`, `requester_id`, `addressee_id`, `status` (`pending` or `accepted`), `created_at`; one row per pair of people | **read:** either person. **insert:** requester is me, status `pending`. **update:** addressee is me (to accept). **delete:** either person. |
| `posts` | `id`, `user_id`, `body` (1–280 chars), `book_ol_key`, `book_title`, `book_author`, `book_cover_id` (all nullable), `created_at` | **read:** my posts, or posts by someone I have an **accepted** friendship with. **insert:** own only, and a book on the post must exactly match a row in my library (title, author, cover). **delete:** own only. |
| `post_likes` | `post_id`, `user_id`, `created_at`; primary key (`post_id`, `user_id`) | **read:** likes on posts I can see. **insert:** as me, on a post I can see. **delete:** my own like. |
| `post_comments` | `id`, `post_id`, `user_id`, `body` (1–280 chars), `created_at` | **read:** comments on posts I can see. **insert:** as me, on a post I can see. **delete:** my own comment, or any comment on my post. |

- **Likes and comments follow their post.** Their policies say "a post I can see" as `exists (select 1 from posts …)`, which runs under the posts read policy, so who sees a post is defined in one place. Never copy the friendship check into them. Both cascade when the post is deleted, and neither can be updated. Because `post_likes` links posts to profiles a second way, a post's author is embedded as `profiles!posts_user_id_fkey`.
- **The database checks a post's book**, not just `createPost`: the insert policy requires an exact match with your own library row, so a post sent straight to the Data API can't carry a forged title or cover (which "Save book" would otherwise copy into a friend's library).
- **A post copies the book's details** (now including its cover) instead of pointing at a `library_items` row. Friends can't read your library, so a link would show up broken for them.
- **A profile is created on first sign-in** (an upsert from the Clerk name). No webhook.
- **RLS is on for every table, and the `anon` role has no policies.** Never turn RLS off, never add a `using (true)` read policy (except the deliberate test break, which is reverted), and never use the Supabase secret/service-role key in the app.
- **Use `alter policy` to change a policy**, not drop and create. It's atomic, and the Supabase MCP server refuses `drop` statements here (its confirmation step fails with "Invalid or expired requestState"). Don't try other ways around that refusal; ask the user.
- **Grants come first.** "Automatically expose new tables" is off, so a new table has no access until a migration grants it. Grant only what the app uses, only to `authenticated`, and never to `anon`, even when a Postgres error hint suggests it. Updates are granted per column (`profiles.display_name`, `profiles.avatar`, `friendships.status`, `library_items.status`) so that accepting a request can't also rewrite who sent it.
- **Only kinnect's Clerk tokens count.** Every table has a restrictive policy requiring `iss` = `https://holy-gelding-7096.clerk.accounts.dev`, because Supabase also trusts its own built-in sign-in. A new table needs the same policy.
- **App queries rely on RLS.** Don't add `.eq('user_id', …)` filters that duplicate a policy. The Playwright test proves RLS works, and redundant filters would hide a broken policy.
- Schema changes are **migrations** applied through the Supabase MCP server, with a copy of each saved in `supabase/migrations/`, never edits in the dashboard. After each one, run the security and performance advisors. The `auth_rls_initplan` warnings are false positives: our `(select auth.jwt()->>'sub')` form already runs once per query.

## Where things happen
- **Who you are:** Clerk's proxy/middleware and `auth()` on the server.
- **What you may see:** Supabase RLS. `src/lib/supabase.ts` creates a server-side client per request whose `accessToken` is the Clerk session token.
- **Data access:** reads go through `src/lib/data.ts` (server-only, not Server Actions). Mutations go in `src/lib/actions.ts` (`"use server"`), which validates its arguments and calls `refresh()` after writing. Every export there is a public POST endpoint, so each one checks `auth()` first. Pages don't talk to Supabase directly. `src/components/ProfileSync.tsx`, in the layout, creates your profile on first sign-in. `src/lib/store.ts` keeps only the unsent post draft (localStorage) and a one-time "Posted…" message (sessionStorage); every read and write may fail quietly when storage is blocked.
- **Open Library is called from the server,** through `/api/books?q=`, which proxies `https://openlibrary.org/search.json` with `fields=key,title,author_name,first_publish_year,cover_i&limit=20`. It sends a User-Agent naming kinnect and its repo URL (as Open Library asks; never the user's email), caches each search for an hour with `"use cache"` and `cacheLife("hours")`, and times out after 8 s. Searches took 1.8–6.1 s in testing, so the page says "Still searching" after 2.5 s. Book types live in `src/lib/books.ts`, and the database types in `src/lib/database.types.ts`, which is regenerated after each migration. Covers load in the browser from `https://covers.openlibrary.org/b/id/<cover_id>-M.jpg`.
- **Open Library states:** loading, nothing found (`numFound: 0` is a 200, not an error), unavailable (timeout or non-200, with retry), and empty library. When search is down, your saved library still shows, since it comes from Supabase. Empty searches are never sent. `cover_i` and `first_publish_year` can be missing or wrong, so the UI never depends on them.

## The end-to-end tests
- `tests/friends.spec.ts` makes the two test readers friends for about a minute: the request badge, A posting about a book, B saving the book from the post and marking it Reading, liking, commenting, A's page, A deleting the comment, B unliking. Then it deletes the post and both copies of the book and unfriends them, pass or fail. If a run is killed mid-way, they can be left as friends, and the privacy test then fails. Check `friendships` before trusting a privacy failure. Clicks time out after 15 s, so cleanup normally gets to run.
- Next keeps the page you navigated away from in the DOM, hidden (so Back is instant). Locators that can match on both pages need `:visible` or a role query.
- `tests/privacy.spec.ts` (Playwright, run with `npm run test:e2e` against the local dev server): Reader A saves a book and posts about it, and Reader B, **not A's friend**, must see neither in B's own feed, on A's page, or in B's library. It cleans up A's post and book afterwards, pass or fail.
- The readers are Clerk **test users** (`lib2-reader-a/b+clerk_test@example.com`, created by `tests/global.setup.ts`). They sign in with a Clerk sign-in token, so no email or code is involved, and they show up on People as "Test Reader A/B".
- `playwright.config.ts` loads `.env.local` with `@next/env` (as `next dev` does), so nobody reads the file. `global.setup.ts` imports `@clerk/backend`, which comes with `@clerk/nextjs` and isn't a new dependency.
- **The red/green demo:** `tests/rls-demo/break.sql` loosens the posts read policy to `using (true)` and the test must FAIL; `tests/rls-demo/restore.sql` puts it back exactly and the test must PASS. Run both through the Supabase MCP server's `execute_sql`, restore immediately, and confirm the policy matches the migration. Saved runs are in `tests/evidence/`.

## Keys
- Keys live in `.env.local`, which the user writes by hand. `.claude/settings.json` denies reading `.env` and `.env.*`. **Never try to read, print or write env files**, and never put a key in code, commits, logs or the README.
- Only the Clerk publishable key and the Supabase URL and publishable key may reach the browser (`NEXT_PUBLIC_*`). The Clerk secret key stays server-side.

## Design rules (carried over from A3)
- **Mobile first.** Design for a phone first: tabs in a bottom bar, tap targets of at least 44px, one column. Wider screens get the same column, with the tabs moved into the top bar.
- **Style.** Bookish, like an e-reader or bone-coloured paper: Literata (serif), warm paper `#f3eddf`, soft black ink, hairline rules, rounded pill buttons, and one oxblood accent like a bookmark ribbon. Approachable rather than techie: sentence case, no all-caps labels. Tokens live in `src/app/globals.css`. Use the shared components in `src/components/`; don't restyle one-off elements.
- **Mostly text.** Posts are text. A post's book shows as its title and author. Book covers appear in the Library, with a designed no-cover fallback.
- **Forms.** One column. Every field has a real `<label>`. Errors sit under the field (linked with `aria-describedby`) and say what to do next, and the typed value is never cleared on error.
- **Accessibility.** Everything works with a keyboard, and focus is always visible.

## Workflow
- Work on branch `full-stack`. Run `/security-review` before merging to `main`.
- One commit per step, then pause for the user to review. Record each step's "Ask your agent" question and answer, plus anything caught, in `learning.md`.
- **Dependencies:** beyond create-next-app's packages, only `@clerk/nextjs`, `@supabase/supabase-js`, `@playwright/test` and `@clerk/testing` are approved. Ask before adding anything else.
- Stay on free tiers. Don't add anything that needs a payment method.
- `npm run build` and `npm run lint` must pass before each commit.
