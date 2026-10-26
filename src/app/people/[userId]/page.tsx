import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { PersonActions } from "@/components/PersonActions";
import { PostItem } from "@/components/posts";
import { Avatar, Banner, PageHeader } from "@/components/ui";
import { getPersonPage, type Person } from "@/lib/data";

// A static title: a name in it would mean reading the database for metadata,
// which can't sit in Suspense
export const metadata: Metadata = { title: "Profile · kinnect" };

// The same check the friend actions use
const CLERK_USER_ID = /^user_[A-Za-z0-9]+$/;

const STATUS: Record<Person["status"], string> = {
  friends: "Friends",
  received: "Asked you to be friends",
  sent: "You asked",
  none: "Not friends yet",
};

// Someone's page: who they are, how you're connected, the friend
// buttons, and their posts (only once you're friends, which the database
// decides). Their library never shows, even to friends.
export default function PersonPage({ params }: PageProps<"/people/[userId]">) {
  return (
    <div className="grid gap-10">
      {/* Which person, and what you may see of them, are only known at request time */}
      <Suspense fallback={<PageHeader title="Profile">Loading…</PageHeader>}>
        {params.then(({ userId }) => (
          <Profile userId={userId} />
        ))}
      </Suspense>
    </div>
  );
}

async function Profile({ userId }: { userId: string }) {
  if (!CLERK_USER_ID.test(userId)) notFound();
  const { userId: me } = await auth();
  if (userId === me) redirect("/me");

  const page = await getPersonPage(userId);
  if (page === "missing") notFound();
  if (!page) {
    return (
      <>
        <PageHeader title="Profile" />
        <Banner tone="accent" title="Couldn't load this page">
          kinnect couldn&apos;t reach its database. Reload the page to try again.
        </Banner>
      </>
    );
  }
  const { person, posts, readAt } = page;

  return (
    <>
      <div className="grid gap-4">
        <div className="flex items-center gap-4">
          <Avatar name={person.name} avatar={person.avatar} size="lg" />
          <PageHeader title={person.name}>{STATUS[person.status]}</PageHeader>
        </div>
        <PersonActions person={person} />
      </div>

      <section aria-labelledby="their-posts" className="grid gap-1">
        <h2 id="their-posts" className="label border-b border-rule pb-2 text-muted">
          Posts
        </h2>
        {/* Whatever the database returns is shown. The status only picks the
            empty message, so a broken policy would show up, not hide. */}
        {posts.length > 0 ? (
          posts.map((post) => <PostItem key={post.id} post={post} now={readAt} />)
        ) : (
          <p className="py-4 text-muted">
            {person.status === "friends"
              ? `${person.name} hasn't posted yet.`
              : `Become friends to see ${person.name}'s posts.`}
          </p>
        )}
        <p className="pt-2 text-[15px] italic text-muted">Their library is private, even from friends.</p>
      </section>
    </>
  );
}
