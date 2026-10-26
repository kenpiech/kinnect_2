import type { Metadata } from "next";
import { Suspense } from "react";
import { Composer } from "@/components/Composer";
import { PageHeader, TextLink } from "@/components/ui";
import { getLibrary } from "@/lib/data";

export const metadata: Metadata = { title: "Write · kinnect" };

// Write a post. "Post about it" in the Library opens this page with
// ?book=/works/OL…W, and that book starts out picked.
export default function NewPostPage({ searchParams }: PageProps<"/post/new">) {
  return (
    <div className="grid gap-8">
      <TextLink href="/feed" className="justify-self-start text-[15px] text-muted">
        ← Back to feed
      </TextLink>
      <PageHeader title="Write a post">Up to 280 characters. Your friends see it in their feed.</PageHeader>
      {/* Your library depends on who's asking, so it loads at request time */}
      <Suspense fallback={<p className="text-muted">Getting your library…</p>}>
        <ComposerWithLibrary searchParams={searchParams} />
      </Suspense>
      {/* The privacy reminder lives only here and on Library, where it matters */}
      <p className="border-t border-rule pt-4 text-[15px] italic text-muted">
        Your posts are for your friends. Your library is private.
      </p>
    </div>
  );
}

async function ComposerWithLibrary({ searchParams }: { searchParams: PageProps<"/post/new">["searchParams"] }) {
  const [library, params] = await Promise.all([getLibrary(), searchParams]);
  const wanted = typeof params.book === "string" ? params.book : null;
  // Only pre-pick a book that's really in your library
  const initialBook = wanted && library?.some((i) => i.ol_key === wanted) ? wanted : null;
  return <Composer library={library ?? []} libraryFailed={!library} initialBook={initialBook} />;
}
