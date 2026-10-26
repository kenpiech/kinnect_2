"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import { removeBook, saveBook, setReadingStatus } from "@/lib/actions";
import { READING_STATUSES, isReadingStatus, type Book, type ReadingStatus } from "@/lib/books";
import type { LibraryItem } from "@/lib/database.types";
import { BookRow } from "./books";
import { Banner, Button, ButtonLink, Field, Toast, plural, useToast } from "./ui";

type Search =
  | { kind: "idle" }
  | { kind: "loading"; q: string; slow: boolean }
  | { kind: "found"; q: string; books: Book[]; total: number }
  | { kind: "none"; q: string }
  | { kind: "down"; q: string }
  | { kind: "signed-out" };

function toBook(item: LibraryItem): Book {
  return { olKey: item.ol_key, title: item.title, author: item.author, coverId: item.cover_id, year: item.year };
}

// The status saved in the database, or "want to read" if it's ever unexpected
function statusOf(item: LibraryItem): ReadingStatus {
  return isReadingStatus(item.status) ? item.status : "want";
}

// The Library tab: search Open Library, save books, and see the books you've
// saved, each marked Want to read, Reading or Finished. Search goes through our /api/books proxy and has its own states
// (searching, nothing found, Open Library down, signed out). Your saved books
// come from Supabase, so they still show when search is down.
export function Library({ items }: { items: LibraryItem[] }) {
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string>();
  const [search, setSearch] = useState<Search>({ kind: "idle" });
  // Books being saved (by olKey) or removed (by id) right now
  const [busy, setBusy] = useState<Set<string>>(() => new Set());
  const [toast, showToast, hideToast] = useToast();
  const input = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const inFlight = useRef<AbortController | null>(null);
  const savedKeys = new Set(items.map((i) => i.ol_key));
  // Which books to list: all, or one reading status
  const [filter, setFilter] = useState<ReadingStatus | "all">("all");
  // Books whose status you changed while this filter was on. They stay in
  // the list until you pick another filter, so the menu you're using doesn't
  // vanish (and take keyboard focus with it) the moment you change it.
  const [kept, setKept] = useState<Set<string>>(() => new Set());
  // Statuses just picked, shown straight away while the server saves them.
  // useOptimistic drops them once the save (and its refresh) has finished, so
  // they can't go stale or outlive a newer pick.
  const [, startTransition] = useTransition();
  const [picked, pick] = useOptimistic(
    {} as Record<string, ReadingStatus>,
    (current, change: { id: string; status: ReadingStatus }) => ({ ...current, [change.id]: change.status }),
  );
  const status = (item: LibraryItem) => picked[item.id] ?? statusOf(item);
  const shown = filter === "all" ? items : items.filter((i) => status(i) === filter || kept.has(i.id));

  function showOnly(next: ReadingStatus | "all") {
    setFilter(next);
    setKept(new Set());
  }

  function mark(key: string, on: boolean) {
    setBusy((s) => {
      const next = new Set(s);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  async function run(q: string) {
    // A newer search replaces one still waiting
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;
    setSearch({ kind: "loading", q, slow: false });
    // Open Library sometimes takes several seconds; say so after a moment
    const slow = setTimeout(() => setSearch((s) => (s.kind === "loading" && s.q === q ? { ...s, slow: true } : s)), 2500);
    try {
      const res = await fetch(`/api/books?q=${encodeURIComponent(q)}`, { signal: controller.signal });
      // The proxy answers 401, or redirects to sign-in, once the session ends
      if (res.status === 401 || res.redirected) return setSearch({ kind: "signed-out" });
      if (!res.ok) return setSearch({ kind: "down", q });
      const data = (await res.json()) as { books: Book[]; total: number };
      setSearch(data.books.length ? { kind: "found", q, ...data } : { kind: "none", q });
    } catch {
      if (!controller.signal.aborted) setSearch({ kind: "down", q });
    } finally {
      clearTimeout(slow);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) {
      setError("Type a title or an author to search.");
      input.current?.focus();
      return;
    }
    setError(undefined);
    run(q);
  }

  async function save(book: Book, status?: ReadingStatus) {
    mark(book.olKey, true);
    const result = await saveBook(book, status);
    mark(book.olKey, false);
    // A newly saved book is Want to read; show everything so it isn't hidden
    // behind another filter and doesn't look like the save failed
    if (result.ok && !status) showOnly("all");
    showToast(result.ok ? `Saved ${book.title}` : result.error);
  }

  function changeStatus(item: LibraryItem, next: ReadingStatus) {
    if (filter !== "all") setKept((k) => new Set(k).add(item.id));
    startTransition(async () => {
      pick({ id: item.id, status: next });
      const result = await setReadingStatus(item.id, next);
      // On failure the old status comes back by itself; say why
      if (!result.ok) showToast(result.error);
    });
  }

  async function remove(item: LibraryItem) {
    mark(item.id, true);
    const result = await removeBook(item.id);
    mark(item.id, false);
    if (!result.ok) return showToast(result.error);
    showToast(`Removed ${item.title}`, {
      label: "Undo",
      onClick: () => {
        hideToast();
        save(toBook(item), status(item));
      },
    });
  }

  return (
    <div className="grid gap-10">
      <section aria-labelledby="search-heading" className="grid gap-5">
        <h2 id="search-heading" className="sr-only">
          Find books
        </h2>
        <form role="search" onSubmit={submit} noValidate className="grid gap-3">
          <Field
            ref={input}
            label="Search Open Library"
            hint="A title, an author, or both."
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            error={error}
          />
          <Button type="submit" className="justify-self-start">
            Search
          </Button>
        </form>
        <SearchResults search={search} savedKeys={savedKeys} busy={busy} onSave={save} onRetry={run} />
      </section>

      <section aria-labelledby="library-heading" className="grid gap-2">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="library-heading" className="text-2xl font-semibold tracking-tight">
            Your library
          </h2>
          {items.length > 0 && <p className="text-[15px] text-muted">{plural(items.length, "book")}</p>}
        </div>
        {items.length === 0 ? (
          <div className="mt-2 rounded-2xl border border-dashed border-line p-5">
            <p className="font-bold">Nothing saved yet</p>
            <p className="mt-1 text-muted">
              Search above and save books you&apos;ve read or want to read. Only you can see your library, not even your
              friends.
            </p>
          </div>
        ) : (
          <>
            <p className="text-[15px] text-muted">Only you can see these, including what you&apos;re reading.</p>
            <div role="group" aria-label="Show" className="flex flex-wrap gap-2 py-2">
              {([{ value: "all", label: "All" }, ...READING_STATUSES] as const).map((s) => {
                const count = s.value === "all" ? items.length : items.filter((i) => status(i) === s.value).length;
                return (
                  <button
                    key={s.value}
                    type="button"
                    aria-pressed={filter === s.value}
                    onClick={() => showOnly(s.value)}
                    className={`min-h-11 cursor-pointer rounded-full border px-4 text-[15px] ${
                      filter === s.value ? "border-ink bg-ink text-paper" : "border-line bg-surface hover:bg-hover"
                    }`}
                  >
                    {s.label} <span className={filter === s.value ? "" : "text-muted"}>{count}</span>
                  </button>
                );
              })}
            </div>
            {shown.length === 0 && (
              <p className="py-4 text-muted">
                Nothing marked {READING_STATUSES.find((s) => s.value === filter)?.label} yet. Change a book&apos;s status
                under its title.
              </p>
            )}
            <ul>
              {shown.map((item) => (
                <BookRow
                  key={item.id}
                  book={toBook(item)}
                  below={
                    <label className="mt-2 inline-flex">
                      <span className="sr-only">Reading status for {item.title}</span>
                      <select
                        value={status(item)}
                        onChange={(e) => changeStatus(item, e.target.value as ReadingStatus)}
                        className="min-h-11 cursor-pointer rounded-full border border-line bg-surface px-3 text-[15px] hover:bg-hover"
                      >
                        {READING_STATUSES.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  }
                >
                  <ButtonLink href={`/post/new?book=${encodeURIComponent(item.ol_key)}`} variant="quiet">
                    Post about it<span className="sr-only"> {item.title}</span>
                  </ButtonLink>
                  <Button variant="quiet" disabled={busy.has(item.id)} onClick={() => remove(item)}>
                    {busy.has(item.id) ? "Removing…" : "Remove"}
                    <span className="sr-only"> {item.title}</span>
                  </Button>
                </BookRow>
              ))}
            </ul>
          </>
        )}
      </section>

      <Toast message={toast} />
    </div>
  );
}

function SearchResults({
  search,
  savedKeys,
  busy,
  onSave,
  onRetry,
}: {
  search: Search;
  savedKeys: Set<string>;
  busy: Set<string>;
  onSave: (book: Book) => void;
  onRetry: (q: string) => void;
}) {
  // Announced to screen readers without moving focus
  const status =
    search.kind === "loading"
      ? "Searching Open Library…"
      : search.kind === "found"
        ? `${plural(search.books.length, "result")} for ${search.q}`
        : search.kind === "none"
          ? `No books match ${search.q}`
          : search.kind === "down"
            ? "Open Library isn't answering"
            : search.kind === "signed-out"
              ? "Your session ended"
              : "";

  return (
    <div>
      <p role="status" className="sr-only">
        {status}
      </p>

      {search.kind === "loading" && (
        <div aria-hidden="true">
          <p className="text-muted">
            {search.slow ? "Still searching. Open Library can take a few seconds." : "Searching Open Library…"}
          </p>
          <ul className="mt-2">
            {[0, 1, 2].map((i) => (
              <li key={i} className="flex items-center gap-4 border-b border-rule py-4">
                <span className="h-[4.5rem] w-12 shrink-0 animate-pulse rounded-md bg-hover motion-reduce:animate-none" />
                <span className="grid flex-1 gap-2">
                  <span className="h-4 w-2/3 animate-pulse rounded bg-hover motion-reduce:animate-none" />
                  <span className="h-3.5 w-1/3 animate-pulse rounded bg-hover motion-reduce:animate-none" />
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {search.kind === "found" && (
        <>
          <p className="text-[15px] text-muted">
            {search.total > search.books.length
              ? `The top ${search.books.length} of ${search.total.toLocaleString()} matches. Add words to narrow it down.`
              : plural(search.books.length, "match")}
          </p>
          <ul className="mt-1">
            {search.books.map((book) => (
              <BookRow key={book.olKey} book={book}>
                {savedKeys.has(book.olKey) ? (
                  <Button variant="secondary" disabled>
                    Saved
                  </Button>
                ) : (
                  <Button variant="secondary" disabled={busy.has(book.olKey)} onClick={() => onSave(book)}>
                    {busy.has(book.olKey) ? "Saving…" : "Save"}
                    <span className="sr-only"> {book.title}</span>
                  </Button>
                )}
              </BookRow>
            ))}
          </ul>
        </>
      )}

      {search.kind === "none" && (
        <Banner title={`No books match “${search.q}”`}>
          <p>Check the spelling, or try fewer words, like just the title or the author&apos;s last name.</p>
          {/* Open Library is edited by volunteers, so new books are often missing.
              Anyone can add one, and it shows up here once they've indexed it. */}
          <p className="mt-2">
            Still can&apos;t find it? kinnect searches Open Library, a free book catalogue built by volunteers, so
            new books are sometimes missing.{" "}
            <a
              href="https://openlibrary.org/books/add"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:decoration-2"
            >
              Add it to Open Library
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
            , and it&apos;ll show up here within a day or so.
          </p>
        </Banner>
      )}

      {search.kind === "down" && (
        <Banner tone="accent" title="Open Library isn't answering">
          <p>Search is down for the moment. Your saved books below are fine.</p>
          <Button variant="secondary" className="mt-3" onClick={() => onRetry(search.q)}>
            Try again
          </Button>
        </Banner>
      )}

      {search.kind === "signed-out" && (
        <Banner tone="accent" title="Your session ended">
          <p>Sign in again to keep searching.</p>
          <ButtonLink href="/sign-in?redirect_url=/library" className="mt-3">
            Sign in
          </ButtonLink>
        </Banner>
      )}
    </div>
  );
}
