"use client";

import type { Person } from "@/data/people";
import { personByHandle } from "@/data/people";
import type { FeedPost } from "@/lib/store";
import { Avatar, Button } from "./ui";

export function timeAgo(at: number, now: number) {
  const mins = Math.round((now - at) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

// One post in a feed. Your own posts show your display name. A post that
// arrived while you were reading fades in.
export function PostCard({
  post,
  myName,
  now,
  arrived,
}: {
  post: FeedPost;
  myName: string;
  now: number;
  arrived?: boolean;
}) {
  const mine = post.author === "me";
  const person = mine ? null : personByHandle.get(post.author);
  const name = mine ? myName : (person?.name ?? post.author);

  return (
    <article
      className={`flex gap-3 border-b border-rule py-5 ${arrived ? "animate-[arrive_.6s_ease-out] motion-reduce:animate-none" : ""}`}
    >
      <Avatar name={name} handle={mine ? "me" : post.author} />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-x-2 text-[15px] leading-snug">
          <span className="font-semibold text-[17px]">{name}</span>
          {!mine && <span className="text-muted">@{post.author}</span>}
          <span className="text-muted">· {timeAgo(post.at, now)}</span>
        </p>
        <p className="mt-1.5 whitespace-pre-wrap break-words text-[18px] leading-relaxed">{post.text}</p>
      </div>
    </article>
  );
}

// A suggested person with a one-line bio and a one-tap Add.
export function PersonCard({
  person,
  added,
  onAdd,
  action,
  children,
}: {
  person: Person;
  added?: boolean;
  onAdd?: () => void;
  // Replaces the Add button, e.g. Remove on the friends list
  action?: React.ReactNode;
  // Shown under the row, e.g. the newest post of someone you just added
  children?: React.ReactNode;
}) {
  return (
    <li className="border-b border-rule">
      <div className="flex items-center gap-3 py-3">
      <Avatar name={person.name} handle={person.handle} />
      <div className="min-w-0 flex-1">
        <p className="font-semibold leading-snug">
          {person.name} <span className="font-normal text-muted">@{person.handle}</span>
        </p>
        <p className="text-[15px] leading-snug text-muted">{person.bio}</p>
      </div>
      {action ??
        (added ? (
          <span className="px-3 text-[15px] font-semibold text-success">✓ Added</span>
        ) : (
          <Button variant="secondary" className="min-h-11 px-4" onClick={onAdd} aria-label={`Add ${person.name}`}>
            + Add
          </Button>
        ))}
      </div>
      {children}
    </li>
  );
}
