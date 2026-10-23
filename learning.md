# Learning log

What I asked my agent at each step, what I learned, and what I caught or stopped it from doing.

## Step 1 · Choose the API: Open Library

**Calls made:** `GET https://openlibrary.org/search.json?q=…&fields=key,title,author_name,first_publish_year,cover_i&limit=20`

| Case | Result |
|---|---|
| A hit ("the hobbit") | `200`, `numFound: 461`, but it took **4.7 s** |
| Nothing found (gibberish, "submarine reactor manual") | `200` with `docs: []`. Not an error. |
| Empty search | `200` with empty results. The app must stop empty searches itself. |
| Missing fields | Some books have no `cover_i`. One had `first_publish_year: 1900` (bad data). |
| Cover | `covers.openlibrary.org/b/id/<cover_i>-M.jpg` returns a JPEG the browser can load directly |

**Ask:** "Explain this response: what each field means, and which ones my tool needs."

- `numFound`: the total number of matches. `0` means show the nothing-found state.
- `docs`: the list of books. The other wrapper fields (`num_found`, `numFoundExact`, `start`, `offset`, `q`, `documentation_url`) aren't needed.
- `key` (`/works/OL27482W`): the work's permanent ID across all editions. It prevents saving the same book twice and links back to Open Library.
- `title`: needed. `author_name`: a **list**, joined into one line when saved.
- `first_publish_year` and `cover_i`: optional, sometimes missing or wrong, so the UI can't depend on them.
- `fields=` keeps the response small. Without it, every book comes back with dozens of fields we'd throw away.

**Takeaways for the build:** the API can be slow (so a timeout, a loading state and caching), "nothing found" is a successful empty list rather than an error, and optional fields need fallbacks.

## Step 2 · Plan the data

Data model written to `AGENTS.md` and read by me before anything was built. **Rule: my library is private, and my posts are shared with my friends.**

**Ask:** "Draw a diagram of my tables: what each one holds, and how each row belongs to one person."

```mermaid
erDiagram
    CLERK_USER ||--|| profiles : "user_id (1 per person)"
    CLERK_USER ||--o{ library_items : "user_id (private)"
    CLERK_USER ||--o{ posts : "user_id"
    CLERK_USER ||--o{ friendships : "requester_id"
    CLERK_USER ||--o{ friendships : "addressee_id"

    profiles {
        text user_id PK "Clerk ID"
        text display_name
        timestamptz created_at
    }
    library_items {
        uuid id PK
        text user_id "default auth.jwt() sub"
        text ol_key "unique per user"
        text title
        text author
        int cover_id "nullable"
        int year "nullable"
        timestamptz added_at
    }
    friendships {
        uuid id PK
        text requester_id "who asked"
        text addressee_id "who was asked"
        text status "pending or accepted"
        timestamptz created_at
    }
    posts {
        uuid id PK
        text user_id "default auth.jwt() sub"
        text body "1-280 chars"
        text book_ol_key "copied, nullable"
        text book_title "copied, nullable"
        text book_author "copied, nullable"
        timestamptz created_at
    }
```

| Table | Owner column | Who can read |
|---|---|---|
| `profiles` | `user_id` (also the primary key: one row per person) | anyone signed in (names for the People tab) |
| `library_items` | `user_id`, filled from the token, never sent by the app | **only me** |
| `friendships` | `requester_id` and `addressee_id` | either of the two people |
| `posts` | `user_id`, filled from the token | me, plus people with an **accepted** friendship with me |

**Takeaways:**
1. One ID ties it all together. Clerk issues it, Supabase reads it from the token (`auth.jwt()->>'sub'`), and every row carries it.
2. `friendships` is the only table that unlocks anything. An *accepted* row lets you read another person's posts.
3. The library never unlocks for anyone else, so a post carries a **copy** of the book's title and author.

## Step 3 · Protect the keys

Deny rule in `.claude/settings.json`: `{"permissions": {"deny": ["Read(./.env)", "Read(./.env.*)"]}}`. I had already put the same rule in my user-wide `~/.claude/settings.json`. The project copy is what's committed, so it travels with the repo.

**Ask:** "Explain why this deny rule protects my keys. Then explain the difference between my publishable and secret keys, and where each one is allowed to go."

- **Why it protects them:** whatever the agent reads enters the conversation, which is sent to the model provider, may be logged, and can leak into commits or output. The rule makes Claude Code itself block the agent's file-reading tool on `.env` and `.env.*`, before the request reaches the model. It blocks **reading only**. Editing and creating files are separate permissions, so the project rule now denies `Edit` too, and I create `.env.local` myself.
- **Layers:** the deny rule (away from the agent), `.gitignore` `.env*` (away from GitHub), `process.env` (away from source code), and no `NEXT_PUBLIC_` prefix on secrets (away from the browser).
- **Publishable keys say who the app is.** They're visible in the browser to anyone, and on their own they can only do what Clerk sign-in and Supabase RLS allow.
- **Secret keys grant power.** Holding one makes you the server.

| Key | Browser | `.env.local` | Vercel | Code / Git / chat |
|---|---|---|---|---|
| Clerk publishable `pk_test_…` | yes | yes | yes | no |
| Supabase URL and publishable key | yes | yes | yes | no |
| Clerk secret `sk_test_…` | **never** | yes | yes | **never** |
| Supabase secret `sb_secret_…` | no | no | no | no. Not used in Kinnect (it bypasses RLS). |

**In class:** a key on its own unlocks nothing in Kinnect. The anonymous role has no RLS policies. Access comes from the signed, short-lived **Clerk session token**: Supabase checks its signature, reads my user ID, and RLS shows me only my rows.

**Caught:** the spec says the deny rule blocks the agent from writing `.env.local` too, and my agent first claimed a Read deny also blocks editing. It doesn't: Read and Edit are separate permissions. I added `Edit(./.env)` and `Edit(./.env.*)` denies to `.claude/settings.json` so the agent can neither read nor write env files.

## Step 4 · Sign-in with Clerk

Ran `npx -y clerk@latest init --app <my dashboard app> --no-skills`, after `clerk auth login` in my own terminal. I skipped Clerk's global agent skills, since that install happens outside this project. `init` installed `@clerk/nextjs`, created `src/proxy.ts` and the sign-in/sign-up pages, wrapped the layout in `<ClerkProvider>`, and wrote its env vars into `.env.local` itself (the agent never saw them).

**Caught in review of `init`'s output:**
- **Nothing was protected.** `init` wrote a bare `clerkMiddleware()`, and its own note says "routes are public by default". Fixed: `proxy.ts` now allows only `/`, `/sign-in` and `/sign-up`, and calls `auth.protect()` for everything else.
- **The build failed.** With `cacheComponents: true`, the catch-all sign-in route only knows its URL at request time, and both the nav's `usePathname()` and `<SignIn />` read it outside `<Suspense>`. Fixed by wrapping the nav, tab bar and Clerk pages in `<Suspense>`.
- **Layout formatting:** `init` re-wrapped the body without re-indenting it and dropped the final newline. Tidied.
- **The deny rule covers the shell too.** When the agent tried to check only the *size* of `.env.local` with `ls`, Claude Code blocked it.

**Check signed out (curl, no session):**

| Route | Result |
|---|---|
| `/`, `/sign-in`, `/sign-up` | `200` |
| `/feed`, `/friends`, `/friends/add`, `/me`, `/post/new`, `/api/books` | `307` → `/sign-in?redirect_url=…` |

### Passwordless sign-in with passkeys (my idea, added in step 4)

I wanted sign-in to be super simple and secure: never a password, just Face ID or a fingerprint.

- **Passkey-only isn't possible.** Clerk needs an email to create and recover the account. So it's: sign up with name, email and a 6-digit code, then add a passkey. After that, sign-ins are just the passkey, with the email code as the fallback.
- **The identifier is the email I type at sign-up**, proven by the code. It doesn't have to match my Apple or Google account. Apple and Google only store and sync the passkey (iCloud Keychain, Google Password Manager). Inside Kinnect and Supabase, the identity is the **Clerk user ID**, not the email.
- **Why passkeys are secure:** no password to leak or reuse, they only work on the exact site they were made for (phishing-proof), and Face ID only unlocks the key on the phone, so no biometric data ever reaches Kinnect or Clerk.
- **Development vs production:** classmates can sign up on the development instance (with a "Development mode" badge and a user cap). Passkeys are tied to a domain, so a `localhost` passkey won't work on the Vercel site.

**Clerk config change** (`clerk config pull` to read, then `clerk config patch --dry-run`, then apply):

| Setting | Before | After |
|---|---|---|
| Passwords | on, **required** (min 15 chars) | **off** |
| Passkeys for sign-in | off (button and autofill already allowed) | **on** |
| Email code sign-in | on | on (sign-up and fallback) |
| First and last name | optional | **required** (People needs names) |

**App change:** `PasskeyPrompt` shows a banner to signed-in users with no passkey on a browser that supports them. It calls Clerk's `user.createPasskey()`, ignores a cancelled Face ID sheet, explains other errors, and remembers "Not now" on the Clerk user.

**Caught:** `clerk config pull` showed first and last name were *enabled but not required*, even though the plan said to require them.

**Follow-up: passkeys "every time."**
- The **"Add a passkey" banner** now comes back on every visit until you add one. "Not now" hides it for that visit only (it used to hide it forever).
- **The sign-in page leads with a big "Sign in with passkey" button**, with Clerk's email-code form below it as the fallback. Browsers (Safari especially) won't open the Face ID sheet unless the person taps something, so one tap plus Face ID is the fastest sign-in a page can offer. Clerk's form also offers your passkey as an autofill suggestion.
- **Security detail:** after a passkey sign-in, the app returns you to the page you were bounced from (`redirect_url`), but only if that URL is on Kinnect itself. Otherwise a crafted link could send someone to another site right after they sign in (an "open redirect").

**Ask:** "Show me how the Clerk CLI works: what clerk init added to my project, file by file."

How the CLI works: `clerk auth login` (in my terminal) saves a token in the macOS credential store. `init` uses that token to call Clerk's API **as me**: it links the folder to my app (remembered through the git remote), detects Next.js and npm, installs the SDK, writes files, and fetches my dev keys into `.env.local`. That's why I never pasted the Clerk keys myself.

| File | What `init` did | What I changed after review |
|---|---|---|
| `package.json` / lockfile | added `@clerk/nextjs` (components, hooks, `auth()`, `clerkMiddleware`) | — |
| `src/proxy.ts` (new) | `clerkMiddleware()` runs before every matching request (skipping static files, always on `/api`), verifies the session cookie, and makes `auth()` work | it blocked no one, so I added `createRouteMatcher` and `auth.protect()` |
| `src/app/layout.tsx` | wrapped `<body>` contents in `<ClerkProvider>`, which loads Clerk in the browser and shares sign-in state | fixed indentation and the final newline; added Kinnect's `appearance` |
| `sign-in/[[...sign-in]]/page.tsx` (new) | Clerk's `<SignIn />`. The optional catch-all route covers Clerk's multi-screen flow (`/sign-in/factor-one`, …) | wrapped in `<Suspense>` (the build failed); passkey button on top |
| `sign-up/[[...sign-up]]/page.tsx` (new) | `<SignUp />`, same pattern | wrapped in `<Suspense>` |
| `.env.local` (gitignored) | Clerk publishable and secret keys, plus the sign-in/up route settings | — (the agent never read it) |

**In one sentence:** `clerk init` installed Clerk's SDK, added a proxy that identifies every request, a provider that shares sign-in state with the UI, catch-all sign-in and sign-up pages, and fetched my dev keys into `.env.local`. It left every route public and broke the build, and catching and fixing that was my job.
