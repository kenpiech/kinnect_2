"use client";

import Link from "next/link";
import { useEffect } from "react";
import { PersonCard, PostCard } from "@/components/cards";
import { Avatar, Banner, PageHeader, TextLink, Toast, plural, useToast } from "@/components/ui";
import { people, personByHandle } from "@/data/people";
import {
  addFriend,
  feed,
  newSinceLastVisit,
  sessionStartedAt,
  sinceWhen,
  takeFlash,
  useNow,
  useStore,
} from "@/lib/store";

// The main screen: your friends' posts and your own, newest first. No
// algorithm. It's never a blank page: with no friends it suggests people,
// and until you've posted it invites your first post. Coming back after a
// while, it says what's new and marks where the new posts end.
export default function Feed() {
  const s = useStore();
  const [toast, setToast] = useToast();
  const now = useNow(s);

  // Pick up a message left by the page that sent us here ("Added Gus…")
  useEffect(() => {
    const message = takeFlash();
    if (message) setToast(message);
  }, [setToast]);

  if (!s) return <p className="text-muted">Loading…</p>;

  const posts = feed(s, now);
  const hasPosted = s.myPosts.length > 0;
  const fresh = newSinceLastVisit(s, now);
  const freshFrom = new Set(fresh.map((p) => p.author)).size;
  const arrivedAfter = sessionStartedAt() ?? now;

  // Invites a first post, or brings back an unfinished draft
  const prompt = (!hasPosted || s.draft.trim()) && (
    <Link
      href="/post/new"
      className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 hover:bg-hover"
    >
      <Avatar name={s.name} handle="me" />
      <span className="min-w-0 flex-1">
        {s.draft.trim() ? (
          <>
            <span className="block font-semibold">Finish your draft</span>
            <span className="line-clamp-1 block text-[15px] text-muted">“{s.draft.trim()}”</span>
          </>
        ) : (
          <>
            <span className="block font-semibold">What are you up to?</span>
            <span className="block text-[15px] text-muted">Write your first post. It goes at the top of your feed.</span>
          </>
        )}
      </span>
    </Link>
  );

  // The divider goes under the oldest new post
  const lastFreshId = fresh.at(-1)?.id;

  function quickAdd(h: string) {
    const result = addFriend(h);
    if (result.ok) setToast(`Added ${personByHandle.get(h)!.name}. ${plural(result.postCount, "post")} in your feed.`);
  }

  if (s.friends.length === 0 && !hasPosted) {
    return (
      <div className="grid gap-8">
        <PageHeader title="Your feed">Add someone, and their posts show up here.</PageHeader>
        {s.draft.trim() && prompt}
        <section aria-labelledby="suggested" className="grid gap-1">
          <h2 id="suggested" className="label border-b border-rule pb-2 text-muted">
            People you might know
          </h2>
          <ul>
            {people.slice(0, 4).map((person) => (
              <PersonCard key={person.handle} person={person} onAdd={() => quickAdd(person.handle)} />
            ))}
          </ul>
          <TextLink href="/people" className="mt-3 justify-self-start">
            See everyone
          </TextLink>
        </section>
        <Toast message={toast} />
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <PageHeader title="Your feed">
        {plural(s.friends.length, "friend")} · newest first
      </PageHeader>

      {s.previousVisit !== null && (
        <Banner tone="accent" title="Welcome back.">
          {fresh.length > 0
            ? `${plural(fresh.length, "new post")} from ${plural(freshFrom, "friend")} since ${sinceWhen(s.previousVisit, now)}.`
            : `Nothing new since ${sinceWhen(s.previousVisit, now)}.`}
        </Banner>
      )}

      {prompt}

      <section aria-label="Posts">
        {posts.map((post) => (
          <div key={post.id}>
            <PostCard post={post} myName={s.name} now={now} arrived={post.author !== "me" && post.at > arrivedAfter} />
            {post.id === lastFreshId && (
              <p className="flex items-center gap-3 py-3 text-[14px] italic text-accent before:h-px before:flex-1 before:bg-accent/40 after:h-px after:flex-1 after:bg-accent/40">
                ↑ New since your last visit
              </p>
            )}
          </div>
        ))}
        <p className="py-8 text-center italic text-muted">
          You&rsquo;re all caught up.{" "}
          <TextLink href="/people" className="not-italic">
            Add more friends
          </TextLink>
        </p>
      </section>

      <Toast message={toast} />
    </div>
  );
}
