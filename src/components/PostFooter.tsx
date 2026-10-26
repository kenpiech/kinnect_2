"use client";

import Link from "next/link";
import { useOptimistic, useRef, useState, useTransition } from "react";
import {
  addComment,
  deleteComment,
  deletePost,
  likeComment,
  likePost,
  saveBookFromPost,
  unlikeComment,
  unlikePost,
} from "@/lib/actions";
import type { FeedPost, PostComment } from "@/lib/data";
import { MAX_POST, postLength, timeAgo } from "@/lib/posts";
import { ConfirmDelete } from "./ConfirmDelete";
import { Avatar, Button, ButtonLink, Field } from "./ui";

// Under each post: Like, Comment, Save (when it's about a book you don't have
// yet) and, on your own posts, Delete. Then who liked it, the comments, and
// the comment box. The heart turns red the moment
// you tap it; if the server refuses, it flips back and says why.
export function PostFooter({ post, now }: { post: FeedPost; now: number }) {
  const [, startTransition] = useTransition();
  const [likedByMe, setLikedByMe] = useOptimistic(post.likes.mine);
  const [likeError, setLikeError] = useState<string | null>(null);
  const [writing, setWriting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const likeCount = post.likes.others.length + (likedByMe ? 1 : 0);
  const likers = likedByMe ? ["You", ...post.likes.others] : post.likes.others;

  function toggleLike() {
    const next = !likedByMe;
    setLikeError(null);
    startTransition(async () => {
      setLikedByMe(next);
      const result = next ? await likePost(post.id) : await unlikePost(post.id);
      if (!result.ok) setLikeError(result.error);
    });
  }

  async function saveBook() {
    setSaving(true);
    setSaveError(null);
    const result = await saveBookFromPost(post.id);
    setSaving(false);
    if (!result.ok) setSaveError(result.error);
  }

  return (
    <div className="mt-2">
      <div className="-ml-2 flex flex-wrap items-center gap-1">
        <Button
          variant="quiet"
          aria-pressed={likedByMe}
          onClick={toggleLike}
          className={`min-h-9 no-underline ${likedByMe ? "text-accent" : "text-muted"}`}
        >
          <span aria-hidden="true" className="text-lg leading-none">
            {likedByMe ? "♥" : "♡"}
          </span>
          {likedByMe ? "Liked" : "Like"}
          {likeCount > 0 && <span className="font-normal">· {likeCount}</span>}
        </Button>
        <Button
          variant="quiet"
          aria-expanded={writing}
          onClick={() => setWriting((w) => !w)}
          className="min-h-9 text-muted no-underline"
        >
          Comment
          {post.comments.length > 0 && <span className="font-normal">· {post.comments.length}</span>}
        </Button>
        {post.bookTitle &&
          (post.bookSaved ? (
            <ButtonLink href="/library" variant="quiet" className="min-h-9 text-[15px] text-muted">
              In your library
            </ButtonLink>
          ) : (
            <Button variant="quiet" disabled={saving} onClick={saveBook} className="min-h-9 text-muted no-underline">
              {saving ? "Saving…" : "Save book"}
              <span className="sr-only"> {post.bookTitle} to your library</span>
            </Button>
          ))}
        {post.mine && <ConfirmDelete what="this post" remove={() => deletePost(post.id)} />}
      </div>
      {(likeError || saveError) && (
        <p role="alert" className="text-[15px] text-danger">
          {likeError ?? saveError}
        </p>
      )}
      {likers.length > 0 && <p className="text-[14px] text-muted">Liked by {listNames(likers)}</p>}

      {post.comments.length > 0 && (
        <ul aria-label="Comments" className="mt-3 grid gap-3">
          {post.comments.map((c) => (
            <li key={c.id} className="flex gap-2">
              <Link href={c.mine ? "/me" : `/people/${c.authorId}`} tabIndex={-1} aria-hidden="true">
                <Avatar name={c.authorName} avatar={c.authorAvatar} size="sm" />
              </Link>
              <div className="min-w-0 flex-1">
                <div className="rounded-2xl bg-surface px-3 py-2">
                  <p className="text-[14px] leading-snug">
                    <Link href={c.mine ? "/me" : `/people/${c.authorId}`} className="font-semibold hover:underline">
                      {c.mine ? "You" : c.authorName}
                    </Link>
                    <time dateTime={c.createdAt} className="text-muted">
                      {" "}
                      · {timeAgo(new Date(c.createdAt).getTime(), now)}
                    </time>
                  </p>
                  <p className="whitespace-pre-wrap break-words text-[16px] leading-relaxed">{c.body}</p>
                </div>
                <div className="-ml-2 flex flex-wrap items-center gap-1">
                  <CommentLike comment={c} />
                  {c.canDelete && <ConfirmDelete what="this comment" remove={() => deleteComment(c.id)} />}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {writing && <CommentBox postId={post.id} onDone={() => setWriting(false)} />}
    </div>
  );
}

// The heart under a comment: the same instant flip as a post's, smaller. The
// count is everyone who liked it, you included.
function CommentLike({ comment }: { comment: PostComment }) {
  const [, startTransition] = useTransition();
  const [liked, setLiked] = useOptimistic(comment.likes.mine);
  const [error, setError] = useState<string | null>(null);
  const count = comment.likes.count - (comment.likes.mine ? 1 : 0) + (liked ? 1 : 0);

  function toggle() {
    const next = !liked;
    setError(null);
    startTransition(async () => {
      setLiked(next);
      const result = next ? await likeComment(comment.id) : await unlikeComment(comment.id);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <>
      <Button
        variant="quiet"
        aria-pressed={liked}
        onClick={toggle}
        className={`min-h-9 text-[14px] no-underline ${liked ? "text-accent" : "text-muted"}`}
      >
        <span aria-hidden="true" className="text-base leading-none">
          {liked ? "♥" : "♡"}
        </span>
        {liked ? "Liked" : "Like"}
        <span className="sr-only"> {comment.mine ? "your comment" : `${comment.authorName}'s comment`}</span>
        {count > 0 && <span className="font-normal">· {count}</span>}
      </Button>
      {error && (
        <p role="alert" className="text-[14px] text-danger">
          {error}
        </p>
      )}
    </>
  );
}

// "You", "You and Sam", "You, Sam and Priya", "You, Sam and 3 others"
function listNames(names: string[]) {
  if (names.length === 1) return names[0];
  if (names.length <= 3) return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
  return `${names.slice(0, 2).join(", ")} and ${names.length - 2} others`;
}

// The comment box. Same 280-character limit as posts. A comment goes to
// everyone who can see the post, which can include people who aren't your
// friends, so the hint says so.
function CommentBox({ postId, onDone }: { postId: string; onDone: () => void }) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const box = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const left = MAX_POST - postLength(text);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) {
      setError("Write something first.");
      box.current?.focus();
      return;
    }
    if (left < 0) {
      setError(`Keep it to ${MAX_POST} characters. You're ${-left} over.`);
      box.current?.focus();
      return;
    }
    setBusy(true);
    const result = await addComment({ postId, body: text });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      box.current?.focus();
      return;
    }
    setText("");
    onDone();
  }

  return (
    <form onSubmit={submit} noValidate className="mt-3 grid gap-2">
      <Field
        ref={box}
        label="Your comment"
        hint="Everyone who can see this post can see your comment."
        error={error}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          if (error) setError(undefined);
        }}
        autoFocus
        aside={
          left < 40 && (
            <span aria-live="polite" className={`text-[14px] ${left < 0 ? "font-semibold text-danger" : "text-muted"}`}>
              {left < 0 ? `${-left} over` : `${left} left`}
            </span>
          )
        }
      />
      <div className="flex gap-2">
        <Button type="submit" disabled={busy} className="min-h-10">
          {busy ? "Posting…" : "Post comment"}
        </Button>
        <Button variant="quiet" disabled={busy} onClick={onDone} className="min-h-10">
          Cancel
        </Button>
      </div>
    </form>
  );
}
