import type { Metadata } from "next";
import { Suspense } from "react";
import { Library } from "@/components/Library";
import { Banner, PageHeader } from "@/components/ui";
import { getLibrary } from "@/lib/data";

export const metadata: Metadata = { title: "Library · kinnect" };

export default function LibraryPage() {
  return (
    <div className="grid gap-8">
      <PageHeader title="Library">Find books on Open Library and keep the ones you love.</PageHeader>
      {/* Your books depend on who's asking, so they load at request time */}
      <Suspense fallback={<p className="text-muted">Opening your library…</p>}>
        <SavedLibrary />
      </Suspense>
    </div>
  );
}

async function SavedLibrary() {
  const items = await getLibrary();
  if (!items) {
    return (
      <Banner tone="accent" title="Couldn't open your library">
        kinnect couldn&apos;t reach its database. Reload the page to try again.
      </Banner>
    );
  }
  return <Library items={items} />;
}
