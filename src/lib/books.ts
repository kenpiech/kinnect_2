// A book as kinnect uses it, shared by the server (the /api/books proxy and
// saveBook) and the browser (the Library page). Only the title is certain:
// Open Library leaves out the author, cover or year for many works, and the
// year is sometimes wrong, so nothing depends on them.
export type Book = {
  olKey: string; // "/works/OL27482W"
  title: string;
  author: string | null;
  coverId: number | null;
  year: number | null;
};

// The same check the database makes on library_items.ol_key
export const OL_WORK_KEY = /^\/works\/OL[0-9]+W$/;

// default=false makes Open Library answer 404 instead of a blank image when it
// has no cover, so the page can show its own
export function coverUrl(coverId: number) {
  return `https://covers.openlibrary.org/b/id/${coverId}-M.jpg?default=false`;
}

// Where you are with a book in your library, in the order they're shown. The
// same three values the database allows on library_items.status.
export const READING_STATUSES = [
  { value: "want", label: "Want to read" },
  { value: "reading", label: "Reading" },
  { value: "finished", label: "Finished" },
] as const;

export type ReadingStatus = (typeof READING_STATUSES)[number]["value"];

export function isReadingStatus(value: unknown): value is ReadingStatus {
  return READING_STATUSES.some((s) => s.value === value);
}
