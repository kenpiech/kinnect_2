"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PersonCard, PostCard } from "@/components/cards";
import { Button, ButtonLink, Toast, plural, useToast } from "@/components/ui";
import { people, personByHandle } from "@/data/people";
import { addAllFriends, addFriend, feed, livePosts, useNow, useStore } from "@/lib/store";

// The first visit. No sign-up and no empty screen: a line on what Kinnect is,
// a few real posts, and people you can add with one tap.
export default function Welcome() {
  const s = useStore();
  const router = useRouter();
  const [toast, setToast] = useToast();
  const now = useNow(s);
  // Friends you didn't add on this screen mean you've been here before
  const [addedHere, setAddedHere] = useState(false);
  const returning = !!s && s.friends.length > 0 && !addedHere;

  useEffect(() => {
    if (returning) router.replace("/feed");
  }, [returning, router]);

  if (!s || returning) return <p className="text-muted">Loading…</p>;

  const live = livePosts(s, now);
  // One recent post each from two different people
  const preview = live.filter((p, i) => live.findIndex((q) => q.author === p.author) === i).slice(0, 2);
  const notAdded = people.filter((p) => !s.friends.includes(p.handle));
  const feedCount = feed(s, now).length;

  function add(handle: string) {
    setAddedHere(true);
    const result = addFriend(handle);
    if (result.ok) setToast(`Added ${personByHandle.get(handle)!.name}. ${plural(result.postCount, "post")} in your feed.`);
  }

  function addAll() {
    setAddedHere(true);
    const count = addAllFriends(notAdded.map((p) => p.handle));
    setToast(`Added ${plural(count, "friend")}.`);
  }

  return (
    <div className="grid gap-8">
      <section className="grid gap-2">
        <h1 tabIndex={-1} className="text-[2rem] font-semibold leading-tight tracking-tight outline-offset-4 sm:text-5xl">
          See what your friends are up to.
        </h1>
        <p className="text-muted sm:text-lg">
          Kinnect is a feed of short text posts from people you choose. No photos, no algorithm, newest first.
        </p>
      </section>

      <section aria-labelledby="now" className="grid gap-1">
        <h2 id="now" className="label border-b border-rule pb-2 text-muted">
          On Kinnect right now
        </h2>
        {preview.map((post) => (
          <PostCard key={post.id} post={post} myName={s.name} now={now} />
        ))}
      </section>

      <section aria-labelledby="people" className="grid gap-1">
        <div className="flex items-end justify-between gap-4 border-b border-rule pb-3">
          <div>
            <h2 id="people" className="text-2xl font-semibold tracking-tight">
              People you might know
            </h2>
            <p className="text-[15px] text-muted">Tap Add, and their posts are in your feed.</p>
          </div>
          {notAdded.length > 1 && (
            <Button variant="quiet" onClick={addAll}>
              Add all {notAdded.length}
            </Button>
          )}
        </div>
        <ul>
          {people.map((person) => {
            const added = s.friends.includes(person.handle);
            const newest = added ? live.find((p) => p.author === person.handle) : undefined;
            return (
              <PersonCard key={person.handle} person={person} added={added} onAdd={() => add(person.handle)}>
                {newest && (
                  <div className="mb-4 rounded-2xl bg-surface px-4 pt-3 [&>article]:border-b-0 [&>article]:pt-1 [&>article]:pb-3">
                    <p className="text-[14px] italic text-muted">Their newest post</p>
                    <PostCard post={newest} myName={s.name} now={now} />
                  </div>
                )}
              </PersonCard>
            );
          })}
        </ul>
      </section>

      {s.friends.length > 0 && (
        <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] sm:bottom-4">
          <ButtonLink href="/feed" className="w-full shadow-lg">
            See your feed · {plural(feedCount, "post")} →
          </ButtonLink>
        </div>
      )}

      <Toast message={toast} raised={s.friends.length > 0} />
    </div>
  );
}
