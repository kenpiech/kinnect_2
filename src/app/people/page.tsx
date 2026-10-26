import type { Metadata } from "next";
import { Suspense } from "react";
import { InviteButton } from "@/components/InviteButton";
import { People } from "@/components/People";
import { Banner, PageHeader } from "@/components/ui";
import { getPeople } from "@/lib/data";

export const metadata: Metadata = { title: "People · kinnect" };

export default function PeoplePage() {
  return (
    <div className="grid gap-8">
      <div className="grid gap-4">
        <PageHeader title="People">Everyone on kinnect. Friends see each other&apos;s posts.</PageHeader>
        <InviteButton />
      </div>
      {/* Who's connected to you depends on who's asking, so it loads at request time */}
      <Suspense fallback={<p className="text-muted">Finding people…</p>}>
        <PeopleList />
      </Suspense>
    </div>
  );
}

async function PeopleList() {
  const people = await getPeople();
  if (!people) {
    return (
      <Banner tone="accent" title="Couldn't load people">
        kinnect couldn&apos;t reach its database. Reload the page to try again.
      </Banner>
    );
  }
  return <People people={people} />;
}
