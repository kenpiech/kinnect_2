"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PostCard } from "@/components/cards";
import { Avatar, Button, Field, PageHeader, TextLink, Toast, useToast } from "@/components/ui";
import { FAST_SPEED, resetAll, setName, setSpeed, useNow, useStore } from "@/lib/store";

// You: your name, your posts, fast-forward for testing, and a way to start over.
export default function Me() {
  const s = useStore();
  const router = useRouter();
  const now = useNow(s);
  const [toast, setToast] = useToast();
  const [name, setNameDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [confirming, setConfirming] = useState(false);

  if (!s) return <p className="text-muted">Loading…</p>;

  const fast = s.clock.speed > 1;
  const posts = [...s.myPosts]
    .reverse()
    .map((p) => ({ id: p.id, author: "me", text: p.text, at: p.createdAt }));

  function saveName(e: React.FormEvent) {
    e.preventDefault();
    const result = setName(name ?? s!.name);
    if (!result.ok) return setError(result.error);
    setError(undefined);
    setNameDraft(null);
    setToast("Name saved.");
  }

  return (
    <div className="grid gap-10">
      <div className="flex items-center gap-4">
        <Avatar name={s.name} handle="me" size="lg" />
        <PageHeader title={s.name === "You" ? "Me" : s.name}>Everything here is saved on this device.</PageHeader>
      </div>

      <form onSubmit={saveName} noValidate className="grid gap-4">
        <Field
          label="Your name"
          hint="Shown on your posts."
          error={error}
          value={name ?? s.name}
          onChange={(e) => {
            setNameDraft(e.target.value);
            if (error) setError(undefined);
          }}
          autoComplete="name"
          maxLength={60}
        />
        <Button type="submit" variant="secondary" className="justify-self-start">
          Save name
        </Button>
      </form>

      <section aria-labelledby="my-posts" className="grid gap-1">
        <h2 id="my-posts" className="label border-b border-rule pb-2 text-muted">
          Your posts
        </h2>
        {posts.length > 0 ? (
          posts.map((post) => <PostCard key={post.id} post={post} myName={s.name} now={now} />)
        ) : (
          <p className="py-4 text-muted">
            Nothing yet. <TextLink href="/post/new">Write your first post</TextLink>
          </p>
        )}
      </section>

      <section aria-labelledby="testing" className="grid gap-3">
        <h2 id="testing" className="label border-b border-rule pb-2 text-muted">
          For testing
        </h2>
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            role="switch"
            checked={fast}
            onChange={(e) => setSpeed(e.target.checked ? FAST_SPEED : 1)}
            className="mt-1 size-5 accent-accent"
          />
          <span>
            <span className="block font-semibold">Fast-forward time</span>
            <span className="block text-[15px] text-muted">
              A day passes every 20 seconds, so friends post every few seconds. You can also open any page with ?fast.
            </span>
          </span>
        </label>

        {!confirming ? (
          <Button variant="secondary" className="justify-self-start" onClick={() => setConfirming(true)}>
            Reset demo data
          </Button>
        ) : (
          <div role="group" aria-label="Confirm reset" className="grid gap-3 rounded-2xl border border-line bg-surface p-4">
            <p>Erase your friends, posts and name, and start again as a first visit?</p>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => {
                  resetAll();
                  router.push("/");
                }}
              >
                Yes, start over
              </Button>
              <Button variant="secondary" onClick={() => setConfirming(false)} autoFocus>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </section>

      <Toast message={toast} />
    </div>
  );
}
