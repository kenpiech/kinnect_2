import { Avatar, ButtonLink } from "@/components/ui";
import { samplePosts } from "@/data/samples";

// The signed-out front door: one line on what kinnect is, the two buttons,
// and three sample posts so it isn't an empty promise. Kept short for a phone
// screen. Static, with no one's real data. Signed-in visitors never see it:
// src/proxy.ts sends them to /feed.
export default function Landing() {
  return (
    <div className="grid gap-10">
      <section className="grid gap-4">
        <h1 tabIndex={-1} className="text-[2rem] font-semibold leading-tight tracking-tight outline-offset-4 sm:text-5xl">
          Keep up with your friends, not bots.
        </h1>
        <p className="text-muted sm:text-lg">
          Post, comment and keep a private reading list. No photos, no algorithm.
        </p>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/sign-up">Sign up</ButtonLink>
          <ButtonLink href="/sign-in" variant="secondary">
            Sign in
          </ButtonLink>
        </div>
      </section>

      <section aria-labelledby="samples" className="grid gap-1">
        <h2 id="samples" className="label border-b border-rule pb-2 text-muted">
          What a feed looks like <span className="font-normal">(sample posts)</span>
        </h2>
        {samplePosts.map((post) => (
          <article key={post.handle} className="flex gap-3 border-b border-rule py-5">
            <Avatar name={post.name} handle={post.handle} />
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-baseline gap-x-2 text-[15px] leading-snug">
                <span className="text-[17px] font-semibold">{post.name}</span>
                <span className="text-muted">· {post.when}</span>
              </p>
              <p className="mt-1.5 text-[18px] leading-relaxed">{post.text}</p>
              {post.book && (
                <p className="mt-3 border-l-2 border-accent pl-3 text-[15px] leading-snug">
                  <span className="text-muted">About </span>
                  <cite className="font-semibold not-italic">{post.book.title}</cite>
                  <span className="text-muted"> by {post.book.author}</span>
                </p>
              )}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
