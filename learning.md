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
