import { Avatar, ButtonLink } from "@/components/ui";
import { samplePosts } from "@/data/samples";

// The signed-out front door: what kinnect is, how it works, and three sample
// posts so it isn't an empty promise. Static, with no one's real data.
// Signed-in visitors never see it: src/proxy.ts sends them to /feed.
export default function Landing() {
  return (
    <div className="grid gap-12">
      <section className="grid gap-4">
        <h1 tabIndex={-1} className="text-[2rem] font-semibold leading-tight tracking-tight outline-offset-4 sm:text-5xl">
          Keep up with your classmates.
        </h1>
        <p className="text-muted sm:text-lg">
          kinnect is a small, quiet social network for your class. Add classmates as friends, post what&apos;s on your mind, and
          keep a private library of the books you&apos;re reading. No photos, no algorithm, newest first.
        </p>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/sign-up">Sign up</ButtonLink>
          <ButtonLink href="/sign-in" variant="secondary">
            Sign in
          </ButtonLink>
        </div>
        <p className="text-[15px] text-muted">No password: sign in with Face ID, Touch ID or an emailed code.</p>
      </section>

      <section aria-labelledby="how" className="grid gap-4">
        <h2 id="how" className="label border-b border-rule pb-2 text-muted">
          How it works
        </h2>
        <ol className="grid gap-4">
          {[
            ["Add classmates", "Send a friend request. Once they accept, you see each other's posts."],
            ["Post, like and comment", "Up to 280 characters. Only your friends see your posts, and only they can like and comment."],
            ["Keep a library", "Search millions of books from Open Library and save the ones you love. Your library is private, and you can mention a book in a post."],
          ].map(([title, body], i) => (
            <li key={title} className="flex gap-4">
              <span
                aria-hidden="true"
                className="grid size-9 shrink-0 place-items-center rounded-full border border-accent font-semibold text-accent"
              >
                {i + 1}
              </span>
              <span>
                <span className="block font-semibold">{title}</span>
                <span className="block text-muted">{body}</span>
              </span>
            </li>
          ))}
        </ol>
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

      <section className="grid justify-items-start gap-3 rounded-2xl border border-line bg-surface p-5">
        <p className="text-xl font-semibold tracking-tight">Your posts are for your friends. Your library is private.</p>
        <ButtonLink href="/sign-up">Make an account</ButtonLink>
      </section>
    </div>
  );
}
