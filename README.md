# Kinnect

**Live:** https://kinnect-chi.vercel.app

A small social app for reading what your friends are up to. You add people and read their short text posts, newest first, with no algorithm and no photos. It looks and reads like a book.

Kinnect has no accounts or database yet, so it saves to your browser (localStorage) and remembers you on the device you used. The friends are seven sample people whose posts arrive over two weeks, counted from your first visit, so there's something new when you come back.

## Testing it quickly (for graders)

1. **First visit:** open the live link in a private window or a fresh browser. You land on the welcome screen. Tap **+ Add** on a person or two, then **See your feed**.
2. **The form:** go to **Add**.
   - Start typing a name ("ro") and pick from the matches. Picking adds that person right away.
   - Press **Add friend** with the box empty.
   - Type `Rosa Delgato` for a "Did you mean…?".
   - Type someone you've already added.

   Each error sits under the field, and what you typed stays.
3. **Coming back:** reload the page or open it in a new tab. Every fresh open is a return visit, so the feed says **Welcome back** and what's new since then.
4. **Fast-forward:** open https://kinnect-chi.vercel.app/?fast, or turn on **Fast-forward time** under **Me**. A sample day then passes every 20 seconds, so friends post every few seconds, and the feed updates while you watch. Reload to see the welcome-back count.
5. **Start over:** **Me → Reset demo data**.

## Who it's for, and why they'd come back

I built Kinnect for someone who wants to keep up with a small circle of people without the noise of a modern feed: no recommendations, no ads, nothing ranked. Just the people you chose, in order.

What brings them back is **new posts from their friends**. The sample friends post through the day, and the app greets every return visit with what's changed:

- "Welcome back. 4 new posts from 3 friends since Saturday."
- A divider in the feed: "↑ New since your last visit".
- When nothing is new, it says so plainly: "Nothing new since your last visit."

## Flows

**Main task:** I add a friend → their posts fill my feed → I come back tomorrow and see what's new since I left.

**Second task:** I write a post → it's at the top of my feed → it's still there when I come back.

```mermaid
flowchart LR
    S1["<b>1 · First visit</b><br/>/<br/>People you might know,<br/>one tap to add"]
    S2["<b>2 · Add a friend</b><br/>/friends/add<br/>Type a name, pick a match,<br/>errors next to the field"]
    S3["<b>3 · It's in my feed</b><br/>/feed<br/>Added @x: their<br/>posts are here"]
    S4["<b>4 · Coming back</b><br/>/feed<br/>Welcome back.<br/>N new posts since Sunday"]
    S1 --> S2 --> S3 --> S4
```

```mermaid
flowchart TD
    A["/friends/add<br/>Name or handle,<br/>matches as you type"] -->|Add friend or pick a match| V{Valid?}
    V -->|Empty| E1["Enter a name or handle,<br/>like @bunkerbill."]
    V -->|Not found| E2["No one named “x”.<br/>Check the spelling or<br/>pick someone below."]
    V -->|Already friends| E3["You're already<br/>friends with Rosa."]
    E1 & E2 & E3 --> FIX["Fix it and try again<br/>(what you typed is still there)"]
    FIX --> A
    V -->|Yes| OK["Added ✓, still on the form<br/>add another, or<br/>See your feed →"]
```

```mermaid
flowchart TD
    R([Open Kinnect again<br/>new tab, reopen or reload]) --> S{Friends saved?}
    S -->|No| W0["/ First visit<br/>People you might know"]
    S -->|Yes| W["/feed<br/>Welcome back.<br/>N new posts since Sunday"]
    W -->|Nothing new| NX[Nothing new since<br/>your last visit]
    W --> NEW[New posts]
    NEW --> DIV[New since your last visit divider]
    DIV --> OLD[Older posts]
    OLD --> CU[You're all caught up]
```

All the diagrams, including the post form, the navigation map and every state, are in [flows.md](flows.md).

### Pages

| Page | Step |
|---|---|
| `/` | First visit: what Kinnect is, two live sample posts, people to add with one tap, and an **Add all** option |
| `/friends/add` | The form: add a friend by name or handle, with type-ahead and suggestions |
| `/feed` | Friends' posts and yours, newest first, with the welcome back message and a first-post prompt |
| `/post/new` | Write a post (280 characters, with a live count) |
| `/friends` | Who you've added, with Remove |
| `/me` | Your name and posts, fast-forward, and Reset demo data |

Every page shares the same navigation. On a phone the tabs sit in a bottom bar, and on wider screens they move to the top. The current page is underlined with the accent colour and marked with `aria-current`.

## Onboarding

Three subagents studied how **Bluesky, Threads and Mastodon** welcome someone new ([research.md](research.md)). Threads was fastest to something useful because it shows real posts before asking for anything. Mastodon was slowest because of the server choice and email confirmation. Bluesky's one-tap starter packs were the best way to fill a feed.

Kinnect has no sign-up at all, and I kept:

- **Posts before anything:** the welcome screen shows two live posts from the sample friends.
- **One tap to add, plus Add all**, from Bluesky starter packs and Threads.
- **A one-line bio next to every Add button**, from Mastodon.
- **Chronological only**, a lesson from complaints about Threads' algorithmic feed.
- **A first-post prompt**, which fills a gap in Bluesky.

When you add someone, their newest post appears right under their name, and a **See your feed** bar appears above the tabs. You never land on an empty screen: an empty feed suggests people, and the Friends page points to Add.

## Forms

There are two forms, adding a friend and writing a post, plus your name on **Me**. All of them use one shared `Field` component:

- one column, with a real `<label>` on every field;
- the error sits under the field, is linked with `aria-describedby`, and says what to do ("Enter a name or handle, like @bunkerbill.", "Cut 16 characters to post.");
- what you typed is never cleared, and focus goes back to the field.

## Components

The shared components are in `src/components/`:

- **In `ui.tsx`:** `Button`, `ButtonLink`, `TextLink`, `Field`, `Banner`, `Toast`, `PageHeader` and `Avatar`.
- **In `cards.tsx`:** `PostCard` and `PersonCard`.
- **`NavBar.tsx`:** the shared navigation. On a phone the tabs are a bottom bar; on wider screens they sit in the top bar.
- **`TypeAhead.tsx`:** the type-ahead list on the add-friend field.
- **`Session.tsx`:** starts the visit clock and shows the fast-forward bar.

Every page is built from these.

## Accessibility

- **Keyboard:** I checked it with only a keyboard. Tab order runs from the skip link to the tabs to the content. I added a friend, opened the feed and posted with no mouse. Every control shows a 2px focus ring.
- **Labels:** every field has a real label, every image has alt text, every button has a name, and each page has one `h1`. Toasts use a polite live region.
- **Motion:** the avatars' blink and the arrival fade stop under *reduce motion*.
- **Contrast** (checked with the agent; WCAG AA needs 4.5:1 for text and 3:1 for control borders):

| Pair | Ratio |
|---|---|
| Ink `#1f1b16` on paper `#f3eddf` | 14.7:1 |
| Muted text `#635b4f` on paper | 5.7:1 |
| Accent `#8b2e1f` on paper (and paper on accent) | 7.2:1 |
| Error text `#9e2a1b` on paper | 6.4:1 |
| Success text `#2f6b45` on paper | 5.4:1 |
| Field borders `#8f8472` on paper | 3.2:1 |

## Visual style

I started from my Assignment 2 **Swiss** design system: Inter Tight, grey paper, one red, and hard black rules. Once the first screen was built, it felt too "techie" for something you read with your morning coffee. So I moved to a **bookish** style, like reading on a Kindle Paperwhite:

- **Literata**, the typeface made for e-books;
- bone-coloured paper and soft black ink, with hairline rules;
- rounded pill buttons, sentence-case labels, and one oxblood accent like a bookmark ribbon.

The app always stays light, even in dark mode. The app also looked lifeless with initials, so each sample friend got a **cartoon avatar**. The avatars are SVGs drawn by `scripts/avatars.py`, and each one blinks every few seconds.

## Tech

- **Stack:** Next.js 16 (App Router) and Tailwind CSS 4, deployed on Vercel's Hobby plan. There are no packages beyond `create-next-app`, and no database, accounts or APIs.
- **Storage:** `src/lib/store.ts` is the only file that touches `localStorage`, under one key (`kinnect:v1`). Next week's database can replace that one file.
- **The clock:** Kinnect keeps its own clock so it can fast-forward. Each sample post in `src/data/people.ts` goes live at `first visit + dayOffset days + hour`.

```bash
npm install
npm run dev   # http://localhost:3000
```

## First-run check

Once Kinnect was live, a subagent used it as a brand-new user. It drove a headless Chrome at phone size (390×844) from an empty profile, looked at screenshots after each step, and never read the code.

Its goal: **"Add three friends and post what you're up to this week."** After that it closed the browser, came back with the same profile, tried fast-forward (`?fast`), and spent a minute using only the keyboard.

**First impression.** "Within 5 seconds the headline and subtitle made it clear: a calm text feed of people you pick." It had a friend and real posts in its feed in about 10 seconds.

**What worked**
- The errors are specific and kind. Each keeps what you typed and keeps focus in the field. For example: "No one named 'Rosa Delgato'. Check the spelling or pick someone below." and "Cut 60 characters to post."
- The type-ahead finds people by partial name or handle, ignoring capitals, and works with the arrow keys.
- Every action confirms itself with a toast ("Added Rosa Delgado. 2 posts in your feed.").
- In fast-forward, new posts arrive without moving what you're reading, and the "↑ New since your last visit" divider marks where you left off.
- The skip link, visible focus rings and active-tab marker all work. The posts are "funny and in character… so I wanted to read on."

**Usability problems it found** (most important first)
1. A half-written post is silently lost if you leave the composer.
2. Removing a friend is one tap with no undo.
3. Picking someone in the type-ahead only fills in their handle. You still have to press Add friend, even though the copy says "pick someone, and their posts join your feed."
4. The two Add buttons behave differently. The form sends you to the feed after each add, but the list's **+ Add** keeps you on the page, so adding three friends with the form takes three round trips.
5. A mistyped name gets no "Did you mean Rosa Delgado?"
6. "Welcome back" shows seconds into the first visit. "Next up: Rosa, around 5 PM" reveals that friends post on a schedule.
7. Toasts cover the page heading for a couple of seconds.
8. Your own post is a dead end: no edit or delete, and no reactions.
9. Keyboard:
   - Tab goes from the header to the bottom tabs and back up to Write.
   - Focus stays on the tab after changing pages.
   - The post box isn't focused when the composer opens.
10. Small things: fast-forward stays on across visits, and Reset demo data sits near the tab bar.

**Coming back.** "The return visit had a hook… but nothing came back to me. My post got no replies or reactions." It suggested friends reacting to your posts, a "N new posts ↑" pill, and a weekly "What's up this week?" prompt.

### What I changed

I chose which problems to fix. Each fix is its own commit:

| Problem | Fix |
|---|---|
| 9. Keyboard | On a phone, the bottom tabs now come last in the page, so Tab order matches the screen. Changing pages moves focus to the new page's heading. The post box is focused when it opens. |
| 7. Toasts cover headings | Toasts now sit just above the tab bar. They can also carry a button (used for Undo). |
| 3, 4. Adding takes extra steps | Picking a type-ahead match adds that person. The form stays on the page, clears and keeps focus, and shows a running "✓ Added Rosa Delgado, Gus Petrakis" line with **See your feed**. |
| 5. No help with typos | A near miss says "Did you mean Rosa Delgado?" and offers a **Yes, add Rosa Delgado** button. |
| 2. Remove has no undo | The "Removed Gus Petrakis." toast has **Undo**, which puts Gus back in the same spot. |
| 1. Drafts are lost | What you write is saved on the device as you type. The feed shows **Finish your draft**, and posting clears it. |
| 6. Friends feel scheduled | I removed "Next up: Rosa, around 5 PM". I kept "Welcome back" on every return, because I want the return to feel instant. |

**Not changed, on purpose:**
- **Friends reacting to your posts (8).** This would make coming back stronger, but it adds a lot of complexity. It fits better next week, once there are real accounts.
- **Fast-forward staying on across visits.** It's a testing tool, and keeping it on is what lets a grader reload and see new posts.

## How I worked with the agent

I built this step by step with Claude Code, with a commit per step (see the history):

1. **Planning (plan mode).** I picked the idea, a text-only social app. Because localStorage is per device, the agent proposed simulating the network. I chose the sample cast, the name, the retention features and the style.
2. **Flows.** The agent drew the first diagram as one tangled chart. I pushed back, and it split the chart into separate diagrams.
3. **Research.** Three subagents studied Bluesky, Threads and Mastodon. I picked which patterns to keep.
4. **Building,** one page at a time. Along the way I asked for:
   - a mobile-first layout;
   - avatars, because the app "looked too dead";
   - a bookish restyle, away from the Swiss look;
   - a welcome-back message on every return, not only after 30 minutes;
   - fast-forward, so a grader can see new posts arrive;
   - type-ahead on the Add tab;
   - a default avatar for me.
5. **Bugs.** I noticed the feed turning dark after visiting a missing page. The agent traced it to Next's built-in 404 styles staying mounted and fixed it.
6. **First-run check.** A subagent tested the live site as a new user. I picked seven of its fixes. I started on friend reactions, then dropped them as more complexity than this week needs.
