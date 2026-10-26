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

## Step 5 · Data in Supabase

**Setup (me, in the dashboards):** created the `kinnect` project (Free, East US, GitHub login), added the Supabase URL and publishable key to `.env.local` by hand, activated Clerk's Supabase integration (adds `"role": "authenticated"` to Clerk session tokens), and added Clerk under Supabase → Third-Party Auth (Supabase now trusts tokens signed by my Clerk instance, checked against Clerk's public keys). Project settings: Data API **on**, "Automatically expose new tables" **off**, automatic RLS **on**.

**MCP:** the agent's Supabase connector is limited to this one project (`project_ref=…`) and to the database, docs, debugging and development tools. I approved it with a browser login, so the agent never handled a Supabase token.

**What got built:**
- Two migrations, saved in `supabase/migrations/`: the four tables with RLS policies and grants, then fixes from Supabase's advisors.
- `src/lib/supabase.ts`: a server-side client per request whose `accessToken` is my Clerk session token.
- `src/lib/data.ts`: server-only reads. `ensureProfile()` creates my profile on first sign-in, and `ProfileSync` runs it from the layout.
- Installed only `@supabase/supabase-js`.

**Two locks on every table:**
1. **Grants:** may this role touch the table at all? Only `authenticated` gets grants, and only for what the app does. `anon` gets nothing.
2. **RLS policies:** which rows? Keyed on `sub` (my Clerk user ID) from the token.

**Checked (simulated users in a transaction that was rolled back):** Bob sees both profiles but only his own library. Bob can't see Alice's post until she **accepts** his request (pending isn't enough). Bob can't accept his own request. After accepting, both see both posts, but **neither sees the other's library**. Bob can't delete Alice's post. After Bob removes the friendship, her post disappears for him again. A non-Clerk token sees nothing. Then the attacks, each refused:

| Attempt | Result |
|---|---|
| Signed out, read any table, over the internet with only the public key | `permission denied` (no grant) |
| Accept a request **and** rewrite `requester_id` (forge a friendship) | `permission denied` (only `status` is updatable) |
| Bob inserts a post with `user_id` = Alice | `violates row-level security policy` |
| Bob creates an already-`accepted` friendship | `violates row-level security policy` |

**End to end:** I signed in and opened Feed, and my profile row appeared as "Ken Piech" under my Clerk user ID. That proves the chain: Clerk token → Supabase verifies the signature → issuer check → RLS lets me insert my own row, with `user_id` filled in from the token, not from the app.

**Caught:**
- **Supabase's setup page said to install `@supabase/ssr` too.** That package manages *Supabase Auth* sessions in cookies. Kinnect signs in with Clerk, so it would have been an unused second session system. Installed only `@supabase/supabase-js`.
- **Supabase trusts its own sign-in, not just Clerk.** Anyone with the publishable key could have created a Supabase Auth account, skipped Clerk, and been "authenticated", able to read every profile. Added a **restrictive** policy on every table that only accepts tokens issued by my Clerk instance (`iss`). Tested: such a token sees nothing.
- **Accepting a request could have forged a friendship.** A policy alone can't stop an UPDATE from changing other columns, so the addressee could have set `requester_id` to anyone and read their posts. Fixed with column-level grants: only `friendships.status` and `profiles.display_name` can be updated.
- **The security advisor flagged a function Supabase itself created.** "Enable automatic RLS" added `rls_auto_enable()` as SECURITY DEFINER in the public schema, callable by anyone at `/rest/v1/rpc/rls_auto_enable`. Revoked it in a second migration. The advisor is now clean, and auto-RLS still works (tested on a throwaway table).
- **Postgres's error hint suggests the dangerous fix.** For a signed-out read, it says `GRANT SELECT ON public.posts TO anon`. Following that would make every post public. The error is the lock working.
- **17 "performance" warnings were false positives.** The linter wants `(select auth.jwt())`, and we wrote `(select auth.jwt()->>'sub')`. `EXPLAIN` showed Postgres computes it once per query (an InitPlan) and uses the index, so I left them.
- **Clerk deprecation:** `createRouteMatcher` is going away, partly because `/sign-in(.*)` also matches look-alike paths like `/sign-inxyz`. Harmless today, since no such routes exist. Saved for the step 10 security review.

**Second lock, Supabase sign-ups off:** in Authentication → Sign In / Providers, I turned off "Allow new users to sign up" and left anonymous sign-ins off and "Confirm email" on. Tested from outside with only the public key: `POST /auth/v1/signup` → `422 signup_disabled`. Kinnect users are unaffected, since they sign up through Clerk and never become Supabase accounts.

**Ask:** "Explain each row-level security policy in plain words, then show me a query that one of them would block."

"Me" means the Clerk user ID in the request's token.

- **Every table, "kinnect clerk sessions only" (restrictive):** whatever else is allowed, the token must come from Kinnect's Clerk instance.
- **profiles:** anyone signed in can read every name (People needs it). You can only create your own profile, and only change your own name.
- **library_items:** you see, add and remove only your own books. Private even from friends.
- **friendships:** you see a friendship only if you're one of the two people in it. You can only send a request from yourself, as pending. Only the person who received a pending request can accept it, and accepting changes only the status. Either person can remove it (decline, cancel or unfriend).
- **posts:** you see your own posts plus posts by anyone you have an **accepted** friendship with, either direction (pending shows nothing). You can only write and delete your own.
- Posts and library items have no update policy and no update grant, so nobody can edit them.

**A blocked query** (real database, rolled back). Alice and Bob each saved a book and aren't friends. As Bob:

| Bob's query | Rows |
|---|---|
| `select * from library_items where user_id = 'user_A'` (Alice's, by name) | **0** |
| `select * from library_items` (no filter) | 1, his own |

The **read my library** policy blocked it. **Reads fail silently:** Bob gets zero rows, not an error, so he can't even tell whether Alice has a library. **Writes fail loudly:** inserting a post with Alice's ID gives `new row violates row-level security policy`. That's why the app never filters by user: `select * from library_items` already returns only mine, and a filter in the app would hide a broken policy from the Playwright test.

## Step 6 · Library tab (Open Library)

**What got built:**
- **`/api/books?q=`**, the server proxy to Open Library: signed-in users only, an 8-second timeout, each search cached for an hour, and a User-Agent naming Kinnect and its repo (Open Library asks for one; I used the repo URL, not my email).
- **`src/lib/actions.ts`:** `saveBook` and `removeBook` as Server Actions. Each checks the session and validates its arguments (`ol_key` format, lengths, whole numbers), then `refresh()`es the page.
- **`/library`:** search, plus "Your library" from Supabase. Removing a book offers Undo.
- Types generated from the live schema (`database.types.ts`), so a misspelled column fails the build.

**Why search goes through our server, not the browser:** one place for the timeout, the cache and the User-Agent; a signed-in check, so strangers can't use Kinnect as a free search proxy; and the browser only ever talks to Kinnect.

**The designed states, all tested in the browser:**

| State | What you see |
|---|---|
| Empty library | "Nothing saved yet", and that only you can see it |
| Loading | "Searching Open Library…" and placeholder rows; after 2.5 s, "Still searching. Open Library can take a few seconds." |
| Results | covers (or a cloth-cover fallback with the first letter), author · year, Save → Saving… → Saved |
| Nothing found | "No books match '…'" with a suggestion (`numFound: 0` is a 200, not an error) |
| Open Library down | Wi-Fi off: "Open Library isn't answering" with Try again, and my saved books still listed (they come from Supabase) |
| Signed out mid-search | "Your session ended" with Sign in |
| Empty search | error under the field, nothing sent |

**Measured:** Open Library took 1.8–6.1 s per search, and with Wi-Fi off the proxy failed fast (`502` in 40 ms). Four books saved, all under my user ID, and still there after a reload.

**Caught:**
- **The API answered signed-out requests with a redirect to the sign-in page.** A `fetch()` can't use an HTML page. The proxy now answers `/api/*` with `401 {"error":"signed_out"}`, and the handler checks again.
- **Server Actions are public endpoints.** Anyone can POST any arguments to `saveBook`, so it checks the session and validates every field instead of trusting the page. RLS is still the real lock: a forged `user_id` can't get past "add to my library".
- **No cover, or a broken one:** many books have no `cover_i`, and some point at nothing. Asking with `?default=false` makes a missing cover a 404 instead of a blank image, so the page shows its own fallback.

**Ask:** "Draw a diagram of one request, from the click to the screen: the browser, my server, Clerk, Supabase, and the API." Also: why does the server call the API?

No single request touches all five, so here is one action, *search "hobbit", then save it*, as its two requests:

```mermaid
sequenceDiagram
  autonumber
  actor Me as Browser
  participant S as My server (Next.js)
  participant C as Clerk
  participant OL as Open Library
  participant DB as Supabase

  Note over Me,OL: Request 1: click Search
  Me->>S: GET /api/books?q=hobbit (+ Clerk session cookie)
  S->>S: proxy.ts verifies the JWT signature with Clerk's cached public key (signed out → 401)
  S->>S: route.ts: auth() again, normalize q, check the hour-long cache
  S->>OL: GET search.json?q=hobbit&fields=…&limit=20 (User-Agent, 8 s timeout)
  OL-->>S: 200 {numFound, docs}
  S->>S: trim to Book[] and cache for an hour
  S-->>Me: 200 {books, total} (or 502 → "Open Library isn't answering")
  Me->>OL: cover images, straight from covers.openlibrary.org
  Note over Me: Screen: results, each with Save

  Note over Me,DB: Request 2: click Save
  Me->>S: Server Action saveBook(book), a POST (+ session cookie)
  S->>S: proxy verifies the JWT; saveBook checks auth() and validates the fields
  S->>C: getToken() (the session JWT: sub, role, iss)
  S->>DB: POST /rest/v1/library_items, Authorization: Bearer <Clerk JWT>
  DB->>DB: signature ✓, grant ✓, issuer ✓, user_id ← sub, "add to my library" ✓
  DB-->>S: 201 Created
  S->>DB: refresh() → getLibrary(): SELECT * (RLS returns only my rows)
  S-->>Me: {ok: true} + the updated page, in one response
  Note over Me: Screen: "Saved", the book in Your library, toast
```

Clerk is mostly off the wire. My server and Supabase both check the token's signature with Clerk's public key, without calling Clerk each time. Clerk's code in the browser refreshes the 60-second token in the background.

**Why the server calls Open Library.** It needs no key, so "hide the secret" is *not* the reason. The real reasons:
1. **One place for failure handling:** the 8 s timeout, and turning Open Library's answers into our three states (books, none, down). A change in Open Library's format means fixing one file.
2. **A shared cache:** searches took 1.8–6.1 s. The server keeps each answer for an hour for everyone, while a browser cache helps only that browser.
3. **Good API citizenship:** Open Library asks for an identifying User-Agent, and browsers won't let a page set one.
4. **A gate:** signed-in only, so Kinnect isn't a free public proxy, and there's one place to add rate limits.
5. **Privacy:** Open Library sees my server, not each classmate's IP address and searches (covers are the exception).
6. **Ready for keys:** an API that needs a secret would already be in the right place.

**Trade-offs:** an extra hop, my server becomes a dependency, all searches share one IP (so the cache matters), and a slow Open Library answer keeps a Vercel function busy while it waits.

**Why Save goes through the server too:** the browser could call Supabase directly with the Clerk token, and RLS would still protect the data. A Server Action keeps the validation and database code out of the page, and returns the updated library in the same response.

## Step 7 · People and friends

**What got built:**
- **`/people`** lists everyone on Kinnect, grouped by how they're connected to me: **Requests for you** (Accept / Decline), **Friends** (Remove, with a second tap to confirm), **Requests you sent** (Cancel), and **People you may know** (Add friend, with a name filter once there are more than five).
- **`getPeople()`** reads all profiles (any signed-in user may) and my friendships (RLS returns only rows I'm in), then labels each person: none, sent, received, or friends.
- **Actions:** `sendFriendRequest`, `acceptFriendRequest` and `removeFriendship`. Decline, cancel and unfriend are the same thing: the row goes away.
- The tabs are now **Feed · Library · People · Me**, and A3's Friends and Add pages are gone.

**How the database keeps it honest:** the app sends only `addressee_id`, and `requester_id` (me) and `status` (pending) fill themselves in. The "send a friend request" policy checks both. Accepting can change only `status` (the column grant), and only on a pending request sent to me (the policy). If an accept matches no row, the request was cancelled, and the page says so.

**Deploying early:** to test with a second real person, Kinnect went on Vercel (`kinnect-2.vercel.app`) before step 11. Production tracks `full-stack` until the merge, because preview links sit behind a Vercel login and change on every push, and a passkey only works on the address it was made on. Vercel holds the Clerk secret key (marked Sensitive). The server needs it, and it never reaches the browser.

**Going live (early, for a real second user):**
- **The first deploys crashed with `500` on every page** except `/favicon.ico`, the one file that skips `proxy.ts`, which pointed at Clerk's middleware. The log said `Publishable key not valid`. The key in Vercel was **cut off at 80 characters** and ended in `$`: I'd copied it from `.env.local` open in **nano**, which marks a line too long for the screen with a `$` at the edge and doesn't wrap it. The Supabase publishable key was cut the same way. Fixed by pasting the full values, re-entering the secret key (`grep '^CLERK_SECRET_KEY=' .env.local | cut -d= -f2- | tr -d '\n' | pbcopy` copies it without showing it), and redeploying with the build cache off. Lesson: open env files in a wrapping editor (or `nano -$`), and check a pasted key's *end*, not just its `pk_test_` start.
- **Public vs Sensitive in Vercel:** the `NEXT_PUBLIC_*` values are "Config" (they ship to the browser by design). `CLERK_SECRET_KEY` is Sensitive. Vercel warned when a `NEXT_PUBLIC_` variable was marked Sensitive, and the right answer was to leave the prefix (without it, sign-in breaks) and mark it Config.
- **Signed out, live:** pages redirect browsers to Clerk's sign-in handshake, scripts without browser headers get `404` (Clerk hides protected pages from bots), and `/api/books` answers `401`.

**Renamed Kinnect → lib2.** The name change touched the logo, titles, messages, the Open Library User-Agent and the package name. `lib2.vercel.app` was taken, so the address is **`lib-2-app.vercel.app`**. We renamed *before* anyone added a passkey on the live site, because a passkey only works on the address it was made on. The repo stays `kinnect_2`.

## Step 8 (part 1) · Posts with a book from your library

- Posts moved from A3's localStorage to **Supabase**. **Write** has an optional "Add a book from your library" list of radio choices with covers, and **Library** has "Post about it" on each saved book, which opens Write with that book picked (`/post/new?book=/works/OL…W`, pre-picked only if it's really in my library).
- **`createPost` copies the title and author from my own library row on the server.** The page sends only which book. So in the app, a post can only name a book I saved. RLS can't enforce that by itself, since someone calling Supabase directly could write any book title on their *own* post. That only affects their own post's text, so it's acceptable.
- **The feed** reads posts with no author filter; the "read mine and my friends' posts" policy decides. The author's name comes from `profiles`, and the book shows as title and author under an oxblood rule. Delete on my own posts takes a second tap.
- **Caught:** lint flagged `Date.now()` inside a component (React components must be pure), so `getFeed()` returns when it read the posts, and "3m ago" uses that. The 280 limit counts characters the way Postgres does (`[...text]`), so an emoji counts as one, not two.
- **Caught live: Feed crashed with "ERROR 1097358053".** In production Next.js hides server errors behind a digest number; Vercel's logs had the real one: `Attempted to call plural() from the server but plural is on the client`. The server-rendered Feed called `plural()`, a plain function from `ui.tsx`, which is a `"use client"` file. Server components may *render* client components, but can't *call functions* from client files. The build doesn't check this; it only fails when the page renders, and the agent hadn't opened Feed signed in before handing it over. Fixed by moving `plural` to `src/lib/format.ts` (no `"use client"`), and checked that no other server file calls a client function. Also added space between the book choices on Write.

## Step 8 (part 2) · Me on Supabase, and required avatars (my idea)

- **Me** moved off localStorage: name (editable, `profiles.display_name`), counts, my own posts with Delete, and a visible **Sign out** button (Clerk's is hidden behind the initials menu). The A3 testing switches are gone.
- **Avatars:** initials were too boring, so everyone now picks one of **12 drawn readers**, in the same cartoon style as A3's personas (same script parts, same blink, which stops for reduce-motion), with a range of skin tones, ages and hair (glasses, bun, curls, beanie, beard, bob, headscarf, silver hair, braids, headphones, freckles, cap).
- **Required:** a new member gets a modal picker over every page until they choose. It's a native `<dialog>` opened with `showModal()`, so the page behind can't be clicked or tabbed into, and Escape is blocked. Saving refreshes the page, and the layout stops rendering the picker once the profile has an avatar. It can be changed any time on Me.
- **Database:** a migration added `profiles.avatar` with a **check that only allows the 12 names**, plus a column grant to update it. Tested: Bob can set his own, can't change Alice's, and `'../../evil'` is rejected by the check, so nobody can point their avatar at an arbitrary path.
- **Caught (my own Me post):** a post showed up in Feed but not on Me, because Me still read A3's localStorage. That prompted rebuilding Me on Supabase.
- Added a 13th avatar on request: long blonde hair (`blonde`). A new drawing also means a migration, since the `profiles.avatar` check lists every key.
- Added six character avatars on request: ninja, wizard, viking, detective, pilot and a polar bear (19 in all). The bear isn't a person, so it has its own drawing function with the same outline and blink. Checked that the app's list, the drawing files and the database check all name the same 19.

## Step 7 (spec) · The privacy test: watched it fail, then pass

**The test** (`tests/privacy.spec.ts`, `npm run test:e2e`): two Clerk test users who are **not friends**. Reader A searches Open Library, saves a book, and posts about it. Reader B opens their own Feed and Library, and must see **neither A's post nor A's book**. Then A's post and book are deleted, pass or fail. The app itself never filters by user, so the only thing standing between B and A's post is row-level security.

**Setup:** `@playwright/test` and `@clerk/testing` (both pre-approved). `tests/global.setup.ts` gets a Clerk testing token, which lets the test browser past Clerk's bot protection, and creates the two users if they're missing. Their `+clerk_test@example.com` addresses mark them as test accounts, so no real email is sent. They sign in with a sign-in token from Clerk's server API, so there's no code to type. `playwright.config.ts` loads `.env.local` the way `next dev` does, so the keys reach the test without anyone opening the file.

**Red, then green** (saved in `tests/evidence/`):

| Run | Posts read policy | Result |
|---|---|---|
| 1 | `using (true)` (`tests/rls-demo/break.sql`) | **FAIL**: `B must not see A's post`, Expected: 0, Received: 1 |
| 2 | restored (`tests/rls-demo/restore.sql`) | **PASS** in 22 s |

The policy was loose for under a minute. After restoring, Postgres confirmed the policy text is character-for-character identical to the original migration, and the security advisor was clean. The failed run's cleanup still deleted A's post and book, and my own posts and books were never touched.

**Caught:**
- **It passed on the first try, so I checked the database to see whether it really did the work.** It had: A had posted, saved, and cleaned up. But **Reader B had never picked an avatar**: Playwright's `isVisible()` doesn't wait, so B's picker (which streams in after the page) hadn't appeared yet and the step was silently skipped. B's checks were still valid, but a test that quietly skips steps can't be trusted, so it now waits up to 5 s for the picker.
- **Why the test checks B's Library too:** B's Library page runs `select * from library_items` with no filter. If the "read my library" policy broke, A's book would appear there, so that check covers the second policy for free.

## Cleanup · Assignment 3 leftovers

- **`/` is now a static landing page** for signed-out visitors: what lib2 is, how it works in three steps, and three **book-themed sample posts** from three A3 characters, labelled "sample posts" so nobody mistakes them for real users. Signed-in visitors go straight to Feed (`proxy.ts`).
- **Removed things that had become misleading:** the footer said "Sample friends · saved on this device" (now it states the privacy rule), and A3's "this browser isn't saving" banner and fast-forward bar (`Session.tsx`) could still appear. Also deleted A3's card and type-ahead components and the 65-post sample network.
- **`store.ts` shrank from 336 lines to the two things still kept in the browser:** the unsent draft and the one-time "Posted…" message. Everything else is in Supabase.
- The privacy test still passes after the cleanup. It walks through Write, Feed, Me and Library, so it doubles as a regression check.

**Caught: the red demo leaked to a real user.** While the posts policy was loosened, *I* saw Test Reader A's "private" post in my own feed on the live site. `using (true)` didn't just fail the test; it exposed every post to every signed-in account, real ones included, because the test and the app share one database. For a real product, that demo belongs on a separate test database (a second Supabase project or a branch), never production.

## Feature · Likes and comments

**What:** a heart under every post (tap to like, tap again to take it back, with "Liked by You and Sam" underneath) and comments up to 280 characters. You can delete your own comment, and the author of a post can delete any comment on it.

**The rule, in the database** (`supabase/migrations/likes_and_comments.sql`): **if you can see the post, you can see its likes and comments and add your own; if you can't, they don't exist for you.** The policies say "can see the post" as `exists (select 1 from posts where id = post_id)`. That subquery runs as the signed-in person, so the posts read policy ("mine and my friends'") filters it. Who sees a post is defined once, and likes and comments reuse it instead of copying the friendship check. If the friendship check ever changes, likes and comments follow automatically.

- Two new tables: `post_likes` (one row per person per post, enforced by its primary key) and `post_comments`. Both cascade when the post is deleted.
- **No updates are granted**, so likes and comments can be added and removed but never edited.
- Each table has the restrictive Clerk-issuer policy, like every other table.

**Checked in the database** with three made-up people (A and B friends, C a stranger), all rolled back: B can like and comment on A's post; B is refused (42501) on C's post, and when liking "as A"; C sees 0 likes and 0 comments on A's post; A sees B's like and comment; a non-Clerk token and a signed-out visitor see nothing. The security advisor is clean.

**Checked in the browser** (`tests/likes-comments.spec.ts`): A and B become friends, A posts, B likes and comments, A sees "Liked by Test Reader B" and deletes B's comment, B takes the like back. Then the post and the friendship are removed. Green three runs in a row, together with the privacy test.

**A privacy choice to know about:** a comment is seen by everyone who can see the post. If Sam comments on my post, my other friends see Sam's comment even if they aren't Sam's friends. That's how most social apps work, and the comment box says so: "Everyone who can see this post can see your comment."

**Caught:**
- **The new test broke the old one.** The first run hung on a click until the 2-minute limit, which closed the browser before cleanup could unfriend the two test readers. The next privacy run then found them friends, and B "saw A's private post". That was correct for friends, but the test failed. Clicks now time out after 15 s, so cleanup always gets to run. I also removed the leftover friendship.
- **Cleanup skipped the unfriend step** because it counted the Remove buttons before the People list had streamed in. That's the same trap as `isVisible()` in step 7: `count()` doesn't wait. It now waits for the list first.
- **The heart lies for a moment, on purpose.** It turns red the instant you tap, before the server has saved anything (an "optimistic" update). The test reloaded right after tapping and sometimes cut off the save. A person tapping and leaving immediately could do the same, which is acceptable for a like. The test now waits for the server's reply.
- **Supabase couldn't tell which link to follow.** `post_likes` connects posts to profiles a second way ("people who liked it"), so asking for a post's `profiles` became ambiguous. The query names the link: `profiles!posts_user_id_fkey`.
- The Supabase MCP server refused my test block when it contained `delete`/`update` statements, with "Invalid or expired requestState". It looks like a confirmation step that never reached the user. I didn't try to get around it: the delete rules are covered by the browser test instead (the author removing a comment, B taking back a like).

## Renamed back: lib2 → Kinnect

**My call:** "I'd rather have a social app with a reading tool than a reading app with social features." So the name went back to Kinnect, and the copy now leads with the social side:
- The landing page says "Keep up with your classmates". "How it works" goes add classmates → post, like and comment → keep a library. One of the three sample posts isn't about a book at all.
- The post box asks "What's on your mind?" instead of "What are you reading?". The footer leads with "Your posts are for your friends."
- The logo, page titles, messages, Open Library User-Agent, package name and browser storage keys all say Kinnect again.

**Left alone on purpose:**
- The test readers' emails (`lib2-reader-…`), because they're existing Clerk accounts.
- Migrations already applied, the saved test evidence, and the history above.
- The live address `lib-2-app.vercel.app`, because a passkey only works on the address it was made on. Moving to a Kinnect address is my decision to make.
  - **Decided (2026-10-25):** the primary address is now **https://kinnect-2.vercel.app**. The old one redirects there. Passkeys made on the old address stopped working, which (together with Clerk's sign-in form asking for a passkey after the email step) is why sign-in became kinnect's own email-code form.

## All lowercase: kinnect

I asked for **kinnect** in lowercase everywhere, even at the start of a sentence: the logo, titles, messages, User-Agent and AGENTS.md. The A3-era README, flows and research docs keep the old spelling until the README is rewritten at step 12.

## Features · Reading status, save from a post, a person's page, the request badge, invite

I asked for all of the remaining v1 features at once and to "use subagents as needed, check their work." The split:
- **I built** the database change, reading status and "Save book" (they share the migration and the post data).
- **A subagent built** the person's page, the badge and the Invite button at the same time, in files I wasn't touching.
- **A second, fresh subagent reviewed** all of it afterwards, given the code and not my conclusions.

**Reading status** (`supabase/migrations/reading_status_and_post_covers.sql`): each saved book is **Want to read** (the default), **Reading** or **Finished**, with filter buttons on the Library tab. It's private like the rest of your library. This was the first time `library_items` needed an update, so it got an "update my library" policy and a grant on the `status` column only. Checked with made-up users, rolled back: a new book starts as "want"; you can change your own; a made-up status is refused (23514); editing a title or giving the book to someone else is refused (42501); another person's change affects 0 rows.

**Save book from a post:** a post about a book shows "Save book", or "In your library" once you have it. The server copies the book **from the post**, which it reads under the posts read policy. So you can only save a book from a post you're allowed to see, and the page can't slip in a fake title. Posts now also copy the book's **cover**, so the friend's copy has one. Older posts don't have a cover.

**A person's page** (`/people/[userId]`): avatar, name, how you're connected, the friend buttons, and their posts, which the database returns only to friends. Names and avatars on posts, comments and People link to it. **The page shows whatever posts come back and doesn't decide on its own whether you're friends.** That way a broken policy would be visible, and the privacy test now also checks that B can't see A's post on A's page.

**Badge and invite:** the People tab shows how many requests are waiting on you. It streams into the nav, so the tabs never wait for it, and it disappears once you accept. "Invite a classmate" opens the phone's share sheet, or copies the link on a computer.

**Checking the subagent's work:** I read every file it changed before running anything.
- It had followed the rules: no friends-only check in the app, filters that pick a person rather than repeat a policy, no database call for the badge when signed out.
- It also explained why it chose a different badge design from the one I suggested (passing a promise rather than rendering the nav twice). It cited the Next docs, and its reasoning held up.
- **One gap I fixed:** the page builds a database filter string (`.or(...)`) from the user id in the address. The page checked the id's format, but the data function trusted it. Now the function checks too, so nothing can sneak commas or brackets into the filter later.
- I also removed a duplicate "Invite a classmate" button from the empty People page.

**Caught:**
- **"Undo" would have quietly reset a book's status.** Removing a book and tapping Undo saves it again, which would have come back as "Want to read". Undo now restores the status it had.
- **The friends test found the post twice** on A's page. Next 16 keeps the page you came from in the DOM, hidden, so the Back button is instant, and the hidden feed had the same post. That was a test problem, not an app problem: the locator now matches visible posts only.
- The full suite was green three runs in a row, and the database was left clean afterwards (no friendships, likes, comments, posts or books from the test readers).

**The fresh reviewer's findings** (it found no way to read or change someone else's data). Each one checked against the code before acting:
1. **A forged book could spread into a friend's library.** The app only lets you post about a book from your own library, but the database didn't check that. Someone using the Data API directly could post a real book's key with a made-up title or cover, and "Save book" would copy it into a friend's private library. **Fixed in the database:** the posts insert policy now requires an exact match with a row in your own library. I checked it before and after: all four forgeries went through before the fix and were refused after it (42501), while real posts, including books with no author or cover, still work.
2. **Changing a status while a filter was on made the book vanish** and dropped keyboard focus. Changed books now stay in view until you pick another filter.
3. **Focus could fall to nowhere** after opening a person's page, because a placeholder heading is replaced when the page loads. Feed and Me had the same problem. Fixed once in `RouteFocus`, which now follows the heading when it's replaced (and only then).
4. **Picked statuses were never cleared**, so a status changed on another device could stay stale until a reload. They now use `useOptimistic`, which drops them once the save finishes.
5. **A filter left on could hide a book you'd just saved.** Saving a new book now switches back to All.
6. **The test waited for "any POST"**, and Clerk POSTs in the background. I had already caught and fixed this one: the friends test went red once on "status was saved". It now waits for the Server Action's reply specifically (the `next-action` header).
7. **Test gaps:** the badge check also matched "11 friend requests" (tightened). In a red run, the privacy test stopped at its first leak, so the new check on A's page never ran. The privacy checks are now soft, so a red run reports every place B could see A's post.
8. **"In your library" was a small tap target.** It's now the same size as Like and Comment.

**Also caught:** the Supabase MCP server refused the first version of the fix, again with "Invalid or expired requestState", because it contained `drop policy`. I didn't look for a way around the refusal. The same change written as `alter policy` is atomic (posts never has a moment with no insert rule), so it's the better statement anyway, and it went through.

**Not done, and worth knowing:** the red/green demo hasn't been re-run to watch the new check on A's page fail. Last time the loosened policy showed a test post to real accounts, so that waits until I ask for it.

## Write page · the book picker starts folded

I asked for "Add a book from your library" to be collapsed by default. It's now a button that opens the list. Once a book is picked, the button shows which one. It starts open when you arrive from a book's "Post about it" link, and opens itself if there's a problem with the book you picked.

## Step 8 · Security review

**How it ran:** the `/security-review` command wouldn't start, because this Claude session was opened in the folder above the repo, and the command needs to be inside a git repository. So the agent ran the same review from inside `kinnect_2`, on everything `full-stack` changes compared with `main` (30 commits, 72 files):
1. Read every security-relevant file.
2. Queried the **live** database's tables, policies, grants and functions, not just the migration files.
3. Checked the live site's headers.
4. Sent a subagent to scan every commit for leaked keys and personal data.
5. Proved each suspected issue before calling it a finding.

**Findings and fixes:**

| # | Finding | Severity | Proof | Fix |
|---|---|---|---|---|
| 1 | **Open redirect after passkey sign-in.** The "stay on kinnect" check compared origins only. `…/sign-in?redirect_url=https://lib-2-app.vercel.app//evil.com` passed, and the browser read the path `//evil.com` as another site. Next's router does a full page load for other origins, so a phishing link could sign you in and then hand you to an attacker's page. | Medium | Ran the check against crafted links: `//evil.com/x` came out. Read Next's router: other origins get `location.assign`. | The path must start with exactly one `/`. All 9 crafted links now land on `/feed`. |
| 2 | **No frame protection.** Another site could load kinnect in a hidden frame and trick a signed-in classmate into clicking Accept, which would open their posts to a stranger (clickjacking). | Medium-low | The live site sent no `X-Frame-Options` and no `frame-ancestors` header. | `frame-ancestors 'none'` and `X-Frame-Options: DENY` on every response, plus `nosniff` and a strict referrer policy (`next.config.ts`). |
| 3 | **`created_at` could be set by the user.** Through the Data API, a post dated 2099 would stay pinned to the top of every friend's feed. | Low | The live grants included `posts.created_at` and `post_comments.created_at` for inserts. | Inserts on posts and comments are granted only the columns the app sends. Checked: a normal post works; a 2099 date or a chosen id is refused (42501). |
| 4 | **`createRouteMatcher` is deprecated**, because path matching can drift from how Next routes requests. | Low | Clerk's own deprecation note. | Replaced with a plain path check. The proxy is now documented as a convenience; the real checks are `auth()` in every action and route, plus RLS. |
| 5 | **A compiled Python file was committed** (`scripts/__pycache__/…pyc`). It's build junk that also contained my local folder path. `.gitignore` was missing a few Playwright outputs. | Hygiene | Secrets subagent; confirmed with `git ls-files`. | Untracked it, and ignored `__pycache__`, `*.pyc`, `/blob-report/` and `/playwright/.auth/`. |

**Checked and clean:**
- **No secret has ever been committed, in any commit on any branch**, and no `.env` file was ever added.
- No server-only key reaches the browser: only the two `NEXT_PUBLIC_` publishable values, used in a server-only file.
- RLS is on for all 6 tables, each with the Clerk-only restrictive policy. `anon` has no grants. There are no views, and the one privileged function can't be called by users.
- The posts read policy matches the migration exactly (so the red-demo restore held).
- No raw-HTML rendering anywhere (React escapes everything people type).
- Every Server Action checks the session and validates its input.
- `/api/books` answers 401 when signed out.
- The privacy and friends tests pass after the fixes.

**Worth knowing, not changed:**
- Anyone with the link can sign up, and any signed-in account can see every member's name and avatar on People. That's the design: People needs it, and posts stay friends-only.
- The `.env` deny rules cover Claude's file tools but not a shell command like `cat .env.local`. AGENTS.md forbids it, and a Bash deny rule could enforce it. That change to Claude's permissions is my call to make.

**The literal `/security-review`, afterwards:** I ran it myself in a fresh Claude session inside `kinnect_2`, after the fixes above. The first try failed with `fatal: ambiguous argument 'origin/HEAD...'`: the command diffs against GitHub's default branch, and this repo was pushed from my Mac rather than cloned, so git had never recorded which branch that is. `git remote set-head origin --auto` fixed it (origin/HEAD → main). On the second run the command came back with **no findings worth acting on**, which matches the hand review once its fixes were in.
