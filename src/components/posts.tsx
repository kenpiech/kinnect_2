import Link from "next/link";
import type { FeedPost } from "@/lib/data";
import { timeAgo } from "@/lib/posts";
import { PostFooter } from "./PostFooter";
import { Avatar, BotTag } from "./ui";

// One post in the feed: who, when, what they wrote, and the book it's about,
// shown as its title and author under a bookmark-ribbon rule, then likes and
// comments (PostFooter). "3m ago" is worked out from the time the server read
// the posts, so the server and the browser agree.
export function PostItem({ post, now }: { post: FeedPost; now: number }) {
  const at = new Date(post.createdAt);
  // The author's page, or Me for your own posts
  const profile = post.mine ? "/me" : `/people/${post.authorId}`;
  return (
    <article className="flex gap-3 border-b border-rule py-5">
      {/* A bigger tap target for the same link as the name. Hidden from
          keyboards and screen readers, so they meet the link only once. */}
      <Link href={profile} tabIndex={-1} aria-hidden="true" className="shrink-0 self-start rounded-full">
        <Avatar name={post.authorName} avatar={post.authorAvatar} handle={post.authorBot ?? undefined} />
      </Link>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-x-2 text-[15px] leading-snug">
          <Link
            href={profile}
            className="text-[17px] font-semibold underline decoration-transparent underline-offset-4 hover:decoration-ink"
          >
            {post.mine ? "You" : post.authorName}
          </Link>
          {post.authorBot && <BotTag />}
          <time dateTime={post.createdAt} title={at.toLocaleString("en-US")} className="text-muted">
            · {timeAgo(at.getTime(), now)}
          </time>
        </p>
        <p className="mt-1.5 whitespace-pre-wrap break-words text-[18px] leading-relaxed">{post.body}</p>
        {post.bookTitle && (
          <p className="mt-3 border-l-2 border-accent pl-3 text-[15px] leading-snug">
            <span className="text-muted">About </span>
            <cite className="font-semibold not-italic">{post.bookTitle}</cite>
            {post.bookAuthor && <span className="text-muted"> by {post.bookAuthor}</span>}
          </p>
        )}
        <PostFooter post={post} now={now} />
      </div>
    </article>
  );
}
