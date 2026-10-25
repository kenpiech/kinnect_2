import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Flash } from "@/components/Flash";
import { PostItem } from "@/components/posts";
import { Banner, ButtonLink, PageHeader, TextLink } from "@/components/ui";
import { getFeed } from "@/lib/data";
import { plural } from "@/lib/format";

export const metadata: Metadata = { title: "Feed · lib2" };

// The main screen: your posts and your friends' posts, newest first. No
// algorithm. It's never a blank page: with nothing to show, it points you to
// People and to Write.
export default function FeedPage() {
  return (
    <div className="grid gap-6">
      {/* Whose posts you see depends on who's asking, so they load at request time */}
      <Suspense fallback={<PageHeader title="Your feed">Loading posts…</PageHeader>}>
        <Feed />
      </Suspense>
      <Flash />
    </div>
  );
}

async function Feed() {
  const feed = await getFeed();
  if (!feed) {
    return (
      <>
        <PageHeader title="Your feed" />
        <Banner tone="accent" title="Couldn't load your feed">
          lib2 couldn&apos;t reach its database. Reload the page to try again.
        </Banner>
      </>
    );
  }
  const { posts, friendCount, readAt } = feed;

  return (
    <>
      <PageHeader title="Your feed">
        {plural(friendCount, "friend")} · newest first
      </PageHeader>

      <Link
        href="/post/new"
        className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 hover:bg-hover"
      >
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">What are you reading?</span>
          <span className="block text-[15px] text-muted">Write a post, and add a book from your library if you like.</span>
        </span>
        <span aria-hidden="true" className="text-xl text-accent">
          →
        </span>
      </Link>

      {posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line p-5">
          <p className="font-bold">{friendCount === 0 ? "Your feed is empty" : "No posts yet"}</p>
          <p className="mt-1 text-muted">
            {friendCount === 0
              ? "Add friends on People, and their posts show up here. Or write the first one yourself."
              : "Neither you nor your friends have posted yet. Be the first."}
          </p>
          {friendCount === 0 && (
            <ButtonLink href="/people" variant="secondary" className="mt-3">
              Find people
            </ButtonLink>
          )}
        </div>
      ) : (
        <section aria-label="Posts">
          {posts.map((post) => (
            <PostItem key={post.id} post={post} now={readAt} />
          ))}
          <p className="py-8 text-center italic text-muted">
            You&rsquo;re all caught up.{" "}
            <TextLink href="/people" className="not-italic">
              Add more friends
            </TextLink>
          </p>
        </section>
      )}
    </>
  );
}
