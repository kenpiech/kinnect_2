import type { Metadata } from "next";
import { Suspense } from "react";
import { AvatarForm } from "@/components/AvatarPicker";
import { NameForm, SignOut } from "@/components/MeForms";
import { PostItem } from "@/components/posts";
import { Avatar, Banner, PageHeader, TextLink } from "@/components/ui";
import { getMe } from "@/lib/data";
import { plural } from "@/lib/format";

export const metadata: Metadata = { title: "Me · kinnect" };

// You: your name, your posts, and signing out. Everything here is stored in
// kinnect's database, so it's the same on any device you sign in on.
export default function MePage() {
  return (
    <div className="grid gap-10">
      {/* Your details depend on who's asking, so they load at request time */}
      <Suspense fallback={<PageHeader title="Me">Loading…</PageHeader>}>
        <Me />
      </Suspense>
    </div>
  );
}

async function Me() {
  const me = await getMe();
  if (!me) {
    return (
      <>
        <PageHeader title="Me" />
        <Banner tone="accent" title="Couldn't load your page">
          kinnect couldn&apos;t reach its database. Reload the page to try again.
        </Banner>
      </>
    );
  }

  return (
    <>
      <div className="flex items-center gap-4">
        <Avatar name={me.name} avatar={me.avatar} size="lg" />
        <PageHeader title={me.name}>
          {plural(me.friendCount, "friend")} · {plural(me.bookCount, "book")} · {plural(me.posts.length, "post")}
        </PageHeader>
      </div>

      <NameForm current={me.name} />

      <AvatarForm current={me.avatar} />

      <section aria-labelledby="my-posts" className="grid gap-1">
        <h2 id="my-posts" className="label border-b border-rule pb-2 text-muted">
          Your posts
        </h2>
        {me.posts.length > 0 ? (
          me.posts.map((post) => <PostItem key={post.id} post={post} now={me.readAt} />)
        ) : (
          <p className="py-4 text-muted">
            Nothing yet. <TextLink href="/post/new">Write your first post</TextLink>
          </p>
        )}
      </section>

      <section aria-labelledby="account" className="grid gap-3">
        <h2 id="account" className="label border-b border-rule pb-2 text-muted">
          Account
        </h2>
        <p className="text-[15px] text-muted">
          Your email and passkeys are in the account menu (your avatar, top right).
        </p>
        <SignOut />
      </section>
    </>
  );
}
