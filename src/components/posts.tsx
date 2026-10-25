import type { FeedPost } from "@/lib/data";
import { timeAgo } from "@/lib/posts";
import { PostFooter } from "./PostFooter";
import { Avatar } from "./ui";

// One post in the feed: who, when, what they wrote, and the book it's about,
// shown as its title and author under a bookmark-ribbon rule, then likes and
// comments (PostFooter). "3m ago" is worked out from the time the server read
// the posts, so the server and the browser agree.
export function PostItem({ post, now }: { post: FeedPost; now: number }) {
  const at = new Date(post.createdAt);
  return (
    <article className="flex gap-3 border-b border-rule py-5">
      <Avatar name={post.authorName} avatar={post.authorAvatar} />
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
        <PostFooter post={post} now={now} />
      </div>
    </article>
  );
}
