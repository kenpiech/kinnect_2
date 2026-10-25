import { auth } from "@clerk/nextjs/server";
import { cacheLife } from "next/cache";
import type { NextRequest } from "next/server";
import type { Book } from "@/lib/books";

// Book search for the Library page: GET /api/books?q=hobbit
//
// The browser asks us and we ask Open Library, so there's one place for the
// timeout, the caching and the User-Agent Open Library asks callers to send,
// and strangers can't use lib2 as a free search proxy. Answers:
//   200 { books, total }   (an empty list is "nothing found", not an error)
//   400 empty search       401 signed out       502 Open Library down or slow

const USER_AGENT = "lib2/2.0 (class project; https://github.com/kenpiech/kinnect_2)";

type Doc = { key?: string; title?: string; author_name?: string[]; first_publish_year?: number; cover_i?: number };

// Cached for an hour per search, so repeat searches don't wait on Open
// Library. A failure throws, and isn't cached.
async function searchOpenLibrary(q: string): Promise<{ books: Book[]; total: number }> {
  "use cache";
  cacheLife("hours");
  const url = new URL("https://openlibrary.org/search.json");
  url.searchParams.set("q", q);
  url.searchParams.set("fields", "key,title,author_name,first_publish_year,cover_i");
  url.searchParams.set("limit", "20");
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Open Library answered ${res.status}`);
  const data = (await res.json()) as { numFound?: number; docs?: Doc[] };
  const books = (data.docs ?? []).flatMap((d): Book[] =>
    d.key && d.title
      ? [
          {
            olKey: d.key,
            title: d.title,
            author: d.author_name?.[0] ?? null,
            coverId: d.cover_i ?? null,
            year: d.first_publish_year ?? null,
          },
        ]
      : [],
  );
  return { books, total: data.numFound ?? books.length };
}

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "signed_out" }, { status: 401 });

  // "The  Hobbit" and "the hobbit" are the same search, and share a cache entry
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim().replace(/\s+/g, " ").toLowerCase().slice(0, 100);
  if (!q) return Response.json({ error: "empty" }, { status: 400 });

  try {
    return Response.json(await searchOpenLibrary(q));
  } catch (e) {
    console.warn("Open Library search failed:", e instanceof Error ? e.message : e);
    return Response.json({ error: "unavailable" }, { status: 502 });
  }
}
