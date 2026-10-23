# Kinnect flows

**Main task:** I add a friend → their posts fill my feed → I come back tomorrow and see what's new since I left.

**Second task:** I write a post → it's at the top of my feed → it's still there when I come back.

## 1 · The main flow

One row, read left to right, the same as the arrow sentence.

```mermaid
flowchart LR
    S1["<b>1 · First visit</b><br/>/<br/>People you might know,<br/>one tap to add"]
    S2["<b>2 · Add a friend</b><br/>/friends/add<br/>Type a name, pick a match,<br/>errors next to the field"]
    S3["<b>3 · It's in my feed</b><br/>/feed<br/>Added @x: their<br/>posts are here"]
    S4["<b>4 · Coming back</b><br/>/feed<br/>Welcome back.<br/>N new posts since Sunday"]
    S1 --> S2 --> S3 --> S4
```

## 2 · The form and its errors

Every error sits under the field, says what to do next, and keeps what you typed.

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

## 3 · Writing a post

The second task: write something, and it's at the top of your feed.

```mermaid
flowchart TD
    P["/post/new<br/>280-character box"] -->|Post| V{Valid?}
    V -->|Empty| E1["Write something<br/>before posting."]
    V -->|Too long| E2["Cut N characters<br/>to post."]
    E1 & E2 --> FIX["Fix it and try again<br/>(what you typed is still there)"]
    FIX --> P
    V -->|Yes| OK["/feed<br/>Your post on top"]
```

## 4 · Coming back

Kinnect remembers your friends and when you last visited, so it can show what's new.

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

## Pages and shared navigation

Every page shares the same top bar. The current page is marked, and every form has a Back link.

```mermaid
flowchart LR
    Nav{{Top bar}} --- Feed["/feed"]
    Nav --- Friends["/friends"]
    Nav --- Add["/friends/add"]
    Nav --- Me["/me"]
    Nav --- Write["/post/new"]
    Welcome["/ (first visit only)"] -.->|after the first add| Feed
```

## States

| State | Where | What the person sees |
|---|---|---|
| First visit | `/` | A one-line pitch and suggested people with **+ Add**. Never an empty feed. |
| Just added | `/`, `/friends/add` | A toast ("Added Rosa Delgado. 2 posts in your feed.") and a **See your feed** button. You stay put to add more. |
| Did you mean | `/friends/add` | A near-miss name offers "Yes, add Rosa Delgado". |
| Draft saved | `/post/new`, `/feed` | Half-written posts are kept. The feed shows **Finish your draft**. |
| Just removed | `/friends` | A toast with **Undo**. |
| Fast-forward on | every page | A bar says a day passes every 20 seconds, with **Turn off**. |
| New since last visit | `/feed` | A welcome-back banner with a count, and a divider after the new posts. |
| Caught up | `/feed` | "You're all caught up" at the end of the feed. |
| No friends left | `/feed` | A prompt to add someone, with suggestions (not a blank page). |
| Storage blocked | every page | A notice that changes won't be saved after this visit. The app still works. |
