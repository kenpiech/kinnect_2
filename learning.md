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
