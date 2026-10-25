import type { FeedPost } from "@/lib/data";
import { timeAgo } from "@/lib/posts";
import { DeletePost } from "./DeletePost";
import { Avatar } from "./ui";

// One post in the feed: who, when, what they wrote, and the book it's about,
// shown as its title and author under a bookmark-ribbon rule. Rendered on the
// server, so "3m ago" is worked out once, with no clock mismatch in the browser.
export function PostItem({ post, now }: { post: FeedPost; now: number }) {
  const at = new Date(post.createdAt);
  return (
    <article className="flex gap-3 border-b border-rule py-5">
      <Avatar name={post.authorName} />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-x-2 text-[15px] leading-snug">
          <span className="text-[17px] font-semibold">{post.mine ? "You" : post.authorName}</span>
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
        {post.mine && <DeletePost id={post.id} />}
      </div>
    </article>
  );
}
