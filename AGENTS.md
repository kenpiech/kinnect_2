<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# lib2

A small social network for classmates who read: save books to your library, add friends, and post about what you're reading. Always written in lowercase: **lib2**. Live at **https://lib-2-app.vercel.app** (Vercel production tracks `full-stack` until the merge, then `main`). Version 2 of Assignment 3, "Kinnect" (a localStorage-only prototype). The repo is still `kinnect_2`, and the A3 localStorage key is still `kinnect:v1`.

**The rule everything follows: your library is private, and your posts are shared with your friends.**

## Stack
- Next.js 16 and Tailwind CSS
- **Clerk** for accounts (development keys only)
- **Supabase** (Postgres) for data, connected to Clerk through Supabase third-party auth
- **Open Library** for book search (no key)
- Deployed on Vercel's Hobby plan at `lib-2-app.vercel.app` (passkeys only work on that address)

## Product facts
- **Real friends only.** Friends are other signed-up users. A friendship starts as a request and counts only once the other person accepts. The A3 sample personas (`src/data/people.ts`, `public/avatars/`) appear **only** as static sample posts on the signed-out landing page (`/`), never as friends.
- **Passwordless sign-in.** Clerk has passwords turned off. You sign up with your name and email plus an emailed 6-digit code, and then add a **passkey** (Face ID, Touch ID or a fingerprint). After that, you sign in with the passkey, and the email code is the fallback. `src/components/PasskeyPrompt.tsx` offers the passkey to every signed-in user who doesn't have one ("Not now" hides it for that visit only). The sign-in page leads with a big "Sign in with passkey" button (`src/components/PasskeySignIn.tsx`), with Clerk's email-code form below. Clerk settings are changed with `clerk config patch` (always `--dry-run` first) and recorded in `learning.md`.
- **Signed out, you see nothing real.** Every route except `/` and the Clerk sign-in/sign-up pages requires a session. Signed-out pages redirect to sign-in, and `/api/*` answers `401` JSON (from `src/proxy.ts`, and checked again in each handler).
- **Library tab:** search Open Library and save books. Your library is private, even from friends.
- **People tab:** list and search other users. Request, Accept and Remove (Remove also covers decline, cancel and unfriend).
- **Posts:** up to 280 characters, optionally about one book from your library. Your feed shows your posts and your accepted friends' posts, newest first.
- **Tabs:** Feed · Library · People · Me.
- **Avatars are required.** Everyone picks one of 13 drawn readers (`public/avatars/readers`, drawn by `scripts/reader_avatars.py`; keys in `src/lib/avatars.ts` and the `profiles.avatar` check). Until they do, `ProfileSync` shows `AvatarGate`, a modal `<dialog>` that Escape can't close. They can change it on Me. Avatars show on posts, People and Me. Initials are only a fallback.

## Data model
Four tables in Supabase. Every ID that names a person is a **Clerk user ID** (`text`), and columns that record "who did this" default to `auth.jwt()->>'sub'`. Below, **me** means `auth.jwt()->>'sub'`.

| Table | Columns | Who can do what (RLS) |
|---|---|---|
| `profiles` | `user_id` text PK, `display_name` text, `avatar` (one of 13 keys, null until picked), `created_at` | **read:** any signed-in user (People needs names). **insert/update:** own row only (`display_name` and `avatar` columns). |
| `library_items` | `id`, `user_id`, `ol_key` (e.g. `/works/OL27482W`), `title`, `author`, `cover_id` and `year` (all three nullable), `added_at`; unique (`user_id`, `ol_key`) | **read/insert/delete:** own rows only. Private, even from friends. |
| `friendships` | `id`, `requester_id`, `addressee_id`, `status` (`pending` or `accepted`), `created_at`; one row per pair of people | **read:** either person. **insert:** requester is me, status `pending`. **update:** addressee is me (to accept). **delete:** either person. |
| `posts` | `id`, `user_id`, `body` (1–280 chars), `book_ol_key`, `book_title`, `book_author` (all nullable), `created_at` | **read:** my posts, or posts by someone I have an **accepted** friendship with. **insert/delete:** own only. |

- **A post copies the book's details** instead of pointing at a `library_items` row. Friends can't read your library, so a link would show up broken for them.
- **A profile is created on first sign-in** (an upsert from the Clerk name). No webhook.
- **RLS is on for every table, and the `anon` role has no policies.** Never turn RLS off, never add a `using (true)` read policy (except the deliberate test break, which is reverted), and never use the Supabase secret/service-role key in the app.
- **Grants come first.** "Automatically expose new tables" is off, so a new table has no access until a migration grants it. Grant only what the app uses, only to `authenticated`, and never to `anon`, even when a Postgres error hint suggests it. Updates are granted per column (`profiles.display_name`, `profiles.avatar`, `friendships.status`) so that accepting a request can't also rewrite who sent it.
- **Only lib2's Clerk tokens count.** Every table has a restrictive policy requiring `iss` = `https://holy-gelding-7096.clerk.accounts.dev`, because Supabase also trusts its own built-in sign-in. A new table needs the same policy.
- **App queries rely on RLS.** Don't add `.eq('user_id', …)` filters that duplicate a policy. The Playwright test proves RLS works, and redundant filters would hide a broken policy.
- Schema changes are **migrations** applied through the Supabase MCP server, with a copy of each saved in `supabase/migrations/`, never edits in the dashboard. After each one, run the security and performance advisors. The `auth_rls_initplan` warnings are false positives: our `(select auth.jwt()->>'sub')` form already runs once per query.

## Where things happen
- **Who you are:** Clerk's proxy/middleware and `auth()` on the server.
- **What you may see:** Supabase RLS. `src/lib/supabase.ts` creates a server-side client per request whose `accessToken` is the Clerk session token.
- **Data access:** reads go through `src/lib/data.ts` (server-only, not Server Actions). Mutations go in `src/lib/actions.ts` (`"use server"`), which validates its arguments and calls `refresh()` after writing. Every export there is a public POST endpoint, so each one checks `auth()` first. Pages don't talk to Supabase directly. `src/components/ProfileSync.tsx`, in the layout, creates your profile on first sign-in. `src/lib/store.ts` (localStorage) keeps only unsent post drafts.
- **Open Library is called from the server,** through `/api/books?q=`, which proxies `https://openlibrary.org/search.json` with `fields=key,title,author_name,first_publish_year,cover_i&limit=20`. It sends a User-Agent naming Kinnect and its repo URL (as Open Library asks; never the user's email), caches each search for an hour with `"use cache"` and `cacheLife("hours")`, and times out after 8 s. Searches took 1.8–6.1 s in testing, so the page says "Still searching" after 2.5 s. Book types live in `src/lib/books.ts`, and the database types in `src/lib/database.types.ts`, which is regenerated after each migration. Covers load in the browser from `https://covers.openlibrary.org/b/id/<cover_id>-M.jpg`.
- **Open Library states:** loading, nothing found (`numFound: 0` is a 200, not an error), unavailable (timeout or non-200, with retry), and empty library. When search is down, your saved library still shows, since it comes from Supabase. Empty searches are never sent. `cover_i` and `first_publish_year` can be missing or wrong, so the UI never depends on them.

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
