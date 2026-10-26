# kinnect

**Live:** https://kinnect-2.vercel.app

A small social app for keeping up with your friends: short text posts from people you've accepted as friends, newest first, with no algorithm and no promoted posts. It has a reading tool built in: a private library of books from Open Library that you can mention in a post.

This is version 2 of my Assignment 3 prototype, which saved everything in the browser. Version 2 has real accounts (Clerk), a real database with row-level security (Supabase), a real API (Open Library), and an end-to-end test that proves two people who aren't friends can't see each other's posts or books.

## Trying it (for graders)

1. Open the live link and **Sign up** with your name and email. Clerk emails you a 6-digit code. Pick an avatar.
2. **Library:** search for a book (try "fantastic mr fox"), save it, and mark it Reading. Search for something nonsense to see "nothing found".
3. **People:** send me (Ken Piech) a friend request, or use **Invite a friend**. Once a request is accepted, you see each other's posts.
4. **Write:** post something, optionally about a book from your library. Friends can like it, comment, and save the book to their own library.
5. **Sign in again on another device:** everything is still there. After signing in, kinnect offers to add a passkey, so next time it's Face ID or a fingerprint instead of a code.

## Architecture

```
Browser ──► Next.js on Vercel ──► Supabase (Postgres + RLS)
              │   │                   ▲
              │   └── Clerk session ──┘  (Supabase trusts Clerk's token)
              └──► Open Library search API
```

- **Next.js 16** (App Router) with Server Components for reads (`src/lib/data.ts`) and Server Actions for writes (`src/lib/actions.ts`). Pages never talk to Supabase directly.
- **Clerk** handles accounts: passwordless sign-up with an email code, then passkeys. Sign-in is kinnect's own form built on Clerk's API (`src/components/PasskeySignIn.tsx`).
- **Supabase** stores six tables. The server creates a Supabase client per request whose token is the user's Clerk session token (`src/lib/supabase.ts`), so the database knows who is asking and applies row-level security.
- **Every check that matters happens on the server:** each Server Action and API route calls `auth()` first, and RLS decides which rows come back. `src/proxy.ts` only redirects signed-out visitors as a convenience.

### Where the API is called, and why

Open Library is called **from the server**, through `/api/books?q=` (`src/app/api/books/route.ts`), never from the browser. That gives one place to:
- send a User-Agent naming kinnect and its repo, as Open Library asks,
- cache each search for an hour, so repeated searches don't hit their servers,
- time out after 8 seconds and turn any failure into a clear "search is unavailable, try again" state,
- require a signed-in user, so the endpoint can't be used by anyone on the internet.

The page shows four states: loading (with "Still searching…" after 2.5 s, since searches took up to 6 s in testing), nothing found, unavailable (with retry, while your saved library still shows from Supabase), and an empty library. Only book covers load straight from Open Library in the browser.

## Row-level security, in plain words

RLS is on for every table. Signed-out visitors (`anon`) have no access at all, and every table also requires that the token was issued by kinnect's Clerk app.

| Table | Rule |
|---|---|
| `profiles` | Any signed-in person can read names and avatars (People needs them). You can only change your own. |
| `library_items` | **Only you** can read, add, change or remove your books. Private even from friends. |
| `friendships` | Only the two people involved can see a request. Only the requester can send it, only the other person can accept, either can remove it. |
| `posts` | You can read your own posts and posts by people you have an **accepted** friendship with. A book on a post must match a book in your own library exactly. |
| `post_likes`, `post_comments` | You can read and add them only on posts you can already see. You can remove your own, and a post's author can remove any comment on it. |

The app's queries deliberately don't filter by user, so RLS is the only thing deciding what you see. That's what makes the test below meaningful.

## The privacy test: red, then green

`tests/privacy.spec.ts` (Playwright with `@clerk/testing`): two test users who are **not friends**. Reader A saves a book and posts about it. Reader B checks their feed, A's profile page and their own library, and must see **neither A's post nor A's book**.

To prove the test can fail, I loosened the posts read policy to `using (true)` and ran it:

| Run | Posts read policy | Result |
|---|---|---|
| 1 | `using (true)` ([break.sql](tests/rls-demo/break.sql)) | **FAIL:** `B must not see A's post`, expected 0, received 1 ([output](tests/evidence/1-rls-broken.txt)) |
| 2 | restored ([restore.sql](tests/rls-demo/restore.sql)) | **PASS** ([output](tests/evidence/2-rls-restored.txt)) |

After restoring, Postgres confirmed the policy matched the original migration character for character. A second test, `tests/friends.spec.ts`, makes the two readers friends for a minute and checks the friendly path: request badge, posting, saving a book from a post, likes, comments and reading status.

## Security review

I ran `/security-review` on the `full-stack` branch and fixed everything it found before merging:

| Finding | Fix |
|---|---|
| **Open redirect after sign-in:** `…?redirect_url=https://kinnect…//evil.com` passed the "stay on kinnect" check. | The path must start with exactly one `/`. |
| **No clickjacking protection:** another site could frame kinnect and trick someone into clicking Accept. | `frame-ancestors 'none'`, `X-Frame-Options: DENY`, plus `nosniff` and a strict referrer policy. |
| **Post dates could be set by the user** through the Data API (a post dated 2099 would stay pinned to the top of every friend's feed). | Inserts are granted only the columns the app sends, so dates and IDs always come from the database. |
| **Forged books on posts** (found in an earlier review): a post sent straight to the Data API could carry a made-up title or cover, which "Save book" would copy into a friend's library. | The posts insert policy requires an exact match with a row in your own library. |
| Clerk's `createRouteMatcher` is deprecated. | Replaced with a plain path check. |

Checked and clean: no key has ever been committed, no secret reaches the browser, and every Server Action checks the session and validates its input. After the fixes, a fresh `/security-review` run found nothing worth acting on.

## What I caught along the way

- **The red demo leaked to a real account.** While the policy was loosened, a test user's "private" post showed up in my own feed on the live site, because the test and the app share one database. For a real product, that demo belongs on a separate test database.
- **A test that passed for the wrong reason.** The first privacy run passed, but Reader B had silently skipped picking an avatar, because Playwright's `isVisible()` doesn't wait. The test now waits, and I check the database after test runs.
- **Read and Edit are separate permissions.** My agent first claimed a Read deny rule also stops it editing `.env.local`. It doesn't, so I added Edit denies too.
- **A live crash only the logs explained.** The feed crashed in production with an error number. Vercel's logs showed a server component calling a function from a `"use client"` file, which the build doesn't catch.
- **Passkeys belong to one address.** When the site moved to kinnect-2.vercel.app, existing passkeys stopped working, and Clerk's sign-in form kept asking iPhone users for a passkey they didn't have. Sign-in became kinnect's own email-code form, and it only offers a passkey on a device that has used one.

The full step-by-step log, including every "Ask your agent" answer, is in [learning.md](learning.md). The rules my agent follows are in [AGENTS.md](AGENTS.md).

## Keys

Keys live in `.env.local`, which is git-ignored, and in Vercel's environment variables. `.claude/settings.json` denies the agent reading or editing any `.env` file. Only the Clerk publishable key and the Supabase URL and publishable key are public; the Clerk secret key stays on the server, and the Supabase secret key is never used.

## Free-tier limits and spending alerts

All three services are on free plans with **no payment method on file, so none of them can send a bill**. Hitting a limit stops the service until the limit resets; it never charges.

| Service | Plan | Limits that matter for kinnect | What happens at the limit |
|---|---|---|---|
| **Vercel** | Hobby | 100 GB data transfer and 1M function invocations a month. Non-commercial use only. | Usage stops until the 30-day period resets. |
| **Supabase** | Free | 500 MB database, 5 GB egress, 50,000 monthly active users, 2 projects. **Pauses after a week with no activity.** | Over-quota projects can be restricted; a paused project is restored from the dashboard. |
| **Clerk** | Hobby (development instance) | The production free plan covers 50,000 monthly retained users, but kinnect runs on a **development instance**, which Clerk warns has strict usage limits. Fine for a class. | Real use beyond a class would mean moving to a production instance, which needs a custom domain. |
| **Open Library** | Free, no key | No published quota; they ask for a User-Agent and moderate traffic. | Searches fail, and the "unavailable, try again" state shows. |

**Where I watch usage:** Vercel → Usage, Supabase → Organization → Usage, and Clerk → Dashboard. kinnect's real usage (a class of users, text posts, cached searches) is a tiny fraction of every limit. The one to remember is **Supabase pausing** a quiet project.

**If kinnect moved to paid plans,** I'd set the caps before anything else: Vercel Pro's Spend Management (alerts at set amounts, with the option to pause the project), Supabase Pro with the Spend Cap left on, and Clerk's usage alerts.

## Running it locally

```
npm install
npm run dev          # http://localhost:3000 (needs .env.local with the Clerk and Supabase keys)
npm run test:e2e     # the Playwright tests, against the dev server
```
