import "server-only";
import { auth, currentUser } from "@clerk/nextjs/server";
import type { QueryData } from "@supabase/supabase-js";
import { cache } from "react";
import type { LibraryItem } from "./database.types";
import { supabase } from "./supabase";

// Reads and server-side writes for server components. These aren't Server
// Actions (no "use server"), so the browser can't call them directly.
//
// Queries rely on row-level security to pick out the signed-in person's rows.
// Don't add .eq("user_id", …) filters that repeat a policy: the Playwright
// test proves the policies work, and a duplicate filter would hide a broken one.

// Gives the signed-in person a profile, so friends can find them on People,
// and says whether they've picked an avatar yet. Runs on every full page load,
// but only writes the first time. Null when signed out or Supabase failed.
// cache(): the avatar gate and the nav's account button both ask, and share
// one lookup per request.
export const ensureProfile = cache(async (): Promise<{ avatar: string | null } | null> => {
  const { userId } = await auth();
  if (!userId) return null;

  const db = await supabase();
  // Everyone signed in can read every profile, so this filter is how we find
  // our own row, not a repeat of a policy
  const { data: existing, error: readError } = await db
    .from("profiles")
    .select("avatar")
    .eq("user_id", userId)
    .maybeSingle();
  if (readError) {
    console.error("Couldn't read profile:", readError.message);
    return null;
  }
  if (existing) return existing;

  const user = await currentUser();
  const displayName = user?.fullName?.trim() || user?.firstName?.trim() || "New reader";
  // user_id fills itself in from the session token
  const { error } = await db.from("profiles").insert({ display_name: displayName });
  // 23505: another tab created it a moment ago
  if (error && error.code !== "23505") {
    console.error("Couldn't create profile:", error.message);
    return null;
  }
  return { avatar: null };
});

// Your saved books, newest first. No user filter: the "read my library"
// policy already returns only yours. Null means Supabase couldn't be reached.
export async function getLibrary(): Promise<LibraryItem[] | null> {
  const db = await supabase();
  const { data, error } = await db.from("library_items").select("*").order("added_at", { ascending: false });
  if (error) {
    console.error("Couldn't read library:", error.message);
    return null;
  }
  return data;
}

export type Person = {
  userId: string;
  name: string;
  avatar: string | null;
  // How you're connected: not yet, you asked them, they asked you, or friends
  status: "none" | "sent" | "received" | "friends";
  // The friendship row, for Accept and Remove
  friendshipId: string | null;
};

// Everyone on kinnect but you, with how each of them is connected to you.
// Profiles are readable by anyone signed in; friendships come back only when
// you're one of the two people, thanks to "read my friendships". Null means
// Supabase couldn't be reached.
export async function getPeople(): Promise<Person[] | null> {
  const { userId } = await auth();
  if (!userId) return null;
  const db = await supabase();
  const [profiles, friendships] = await Promise.all([
    db.from("profiles").select("user_id, display_name, avatar").order("display_name"),
    db.from("friendships").select("id, requester_id, addressee_id, status"),
  ]);
  if (profiles.error || friendships.error) {
    console.error("Couldn't read people:", (profiles.error ?? friendships.error)?.message);
    return null;
  }

  const byPerson = new Map(
    friendships.data.map((f) => [f.requester_id === userId ? f.addressee_id : f.requester_id, f]),
  );
  return profiles.data
    .filter((p) => p.user_id !== userId)
    .map((p) => {
      const f = byPerson.get(p.user_id);
      const status: Person["status"] = !f
        ? "none"
        : f.status === "accepted"
          ? "friends"
          : f.requester_id === userId
            ? "sent"
            : "received";
      return { userId: p.user_id, name: p.display_name, avatar: p.avatar, status, friendshipId: f?.id ?? null };
    });
}

export type PostComment = {
  id: string;
  body: string;
  createdAt: string;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  mine: boolean;
  // Your own comment, or any comment on your post
  canDelete: boolean;
};

export type FeedPost = {
  id: string;
  body: string;
  // The book it's about, if any: a copy made when the post was written
  bookOlKey: string | null;
  bookTitle: string | null;
  bookAuthor: string | null;
  // Whether that book is already in your library (for "Save to my library")
  bookSaved: boolean;
  createdAt: string;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  mine: boolean;
  // Whether you liked it, and the names of everyone else who did
  likes: { mine: boolean; others: string[] };
  // Oldest first, like a conversation
  comments: PostComment[];
};

// A post with its author, likes and comments, in one request. The likes and
// comments come back only for posts you can see: their policies reuse the
// posts read policy. The author needs the !posts_user_id_fkey hint because
// post_likes also links posts to profiles (as "people who liked it").
const POST_FIELDS = `id, body, book_ol_key, book_title, book_author, created_at, user_id,
  author:profiles!posts_user_id_fkey(display_name, avatar),
  post_likes(user_id, profiles(display_name)),
  post_comments(id, body, created_at, user_id, profiles(display_name, avatar))`;

type Db = Awaited<ReturnType<typeof supabase>>;
const postQuery = (db: Db) => db.from("posts").select(POST_FIELDS);
type PostRow = QueryData<ReturnType<typeof postQuery>>[number];

// The Open Library keys of the books in your library. No user filter: the
// "read my library" policy returns only yours.
const myBookKeys = (db: Db) => db.from("library_items").select("ol_key");

// saved: the keys from myBookKeys, so a post can say whether you have its book
function toFeedPost(p: PostRow, userId: string, saved: Set<string>): FeedPost {
  const mine = p.user_id === userId;
  return {
    id: p.id,
    body: p.body,
    bookOlKey: p.book_ol_key,
    bookTitle: p.book_title,
    bookAuthor: p.book_author,
    bookSaved: p.book_ol_key !== null && saved.has(p.book_ol_key),
    createdAt: p.created_at,
    authorId: p.user_id,
    authorName: p.author?.display_name ?? "A friend",
    authorAvatar: p.author?.avatar ?? null,
    mine,
    likes: {
      mine: p.post_likes.some((l) => l.user_id === userId),
      others: p.post_likes.filter((l) => l.user_id !== userId).map((l) => l.profiles?.display_name ?? "A friend"),
    },
    comments: p.post_comments
      .toSorted((a, b) => a.created_at.localeCompare(b.created_at))
      .map((c) => ({
        id: c.id,
        body: c.body,
        createdAt: c.created_at,
        authorId: c.user_id,
        authorName: c.profiles?.display_name ?? "A friend",
        authorAvatar: c.profiles?.avatar ?? null,
        mine: c.user_id === userId,
        canDelete: c.user_id === userId || mine,
      })),
  };
}

// Your feed: your posts and your accepted friends' posts, newest first. No
// author filter: the "read mine and my friends' posts" policy decides whose
// posts come back. Null means Supabase couldn't be reached.
// readAt is when the posts were read, for "3m ago".
export async function getFeed(): Promise<{ posts: FeedPost[]; friendCount: number; readAt: number } | null> {
  const { userId } = await auth();
  if (!userId) return null;
  const db = await supabase();
  const [posts, friends, books] = await Promise.all([
    postQuery(db).order("created_at", { ascending: false }).limit(100),
    db.from("friendships").select("id", { count: "exact", head: true }).eq("status", "accepted"),
    myBookKeys(db),
  ]);
  const failed = posts.error ?? friends.error ?? books.error;
  if (failed) {
    console.error("Couldn't read feed:", failed.message);
    return null;
  }
  const saved = new Set((books.data ?? []).map((b) => b.ol_key));
  return {
    readAt: Date.now(),
    friendCount: friends.count ?? 0,
    posts: (posts.data ?? []).map((p) => toFeedPost(p, userId, saved)),
  };
}

// The Me page: your name, your own posts, and how many friends and books you
// have. Null means Supabase couldn't be reached.
export async function getMe(): Promise<{
  name: string;
  avatar: string | null;
  posts: FeedPost[];
  friendCount: number;
  bookCount: number;
  readAt: number;
} | null> {
  const { userId } = await auth();
  if (!userId) return null;
  const db = await supabase();
  // These two user_id filters pick *my* row and *my* posts out of what I'm
  // allowed to read (every profile; my friends' posts too). They select, they
  // don't stand in for a policy.
  const [profile, posts, friends, books] = await Promise.all([
    db.from("profiles").select("display_name, avatar").eq("user_id", userId).maybeSingle(),
    postQuery(db).eq("user_id", userId).order("created_at", { ascending: false }),
    db.from("friendships").select("id", { count: "exact", head: true }).eq("status", "accepted"),
    myBookKeys(db),
  ]);
  const failed = profile.error ?? posts.error ?? friends.error ?? books.error;
  if (failed) {
    console.error("Couldn't read Me:", failed.message);
    return null;
  }
  const name = profile.data?.display_name ?? "You";
  const avatar = profile.data?.avatar ?? null;
  return {
    name,
    avatar,
    readAt: Date.now(),
    friendCount: friends.count ?? 0,
    bookCount: books.data?.length ?? 0,
    posts: (posts.data ?? []).map((p) => toFeedPost(p, userId, new Set(books.data?.map((b) => b.ol_key)))),
  };
}

// How a friendship row (or none) looks from my side, as on People
function connection(
  f: { id: string; requester_id: string; status: string } | null,
  me: string,
): Pick<Person, "status" | "friendshipId"> {
  const status: Person["status"] = !f
    ? "none"
    : f.status === "accepted"
      ? "friends"
      : f.requester_id === me
        ? "sent"
        : "received";
  return { status, friendshipId: f?.id ?? null };
}

export type PersonPage = { person: Person; posts: FeedPost[]; readAt: number };

// One person's page: who they are, how you're connected, and their posts,
// newest first. userId must already be a valid Clerk user ID (the page checks).
// Null means Supabase couldn't be reached; "missing" means no such person.
//
// There's deliberately no "only if friends" check here. The posts read policy
// returns their posts only when you're friends, and the Playwright test relies
// on the app not repeating that policy.
export async function getPersonPage(userId: string): Promise<PersonPage | "missing" | null> {
  // Checked here too, not just on the page: the id goes into the .or() filter
  // string below, so it must never contain commas, dots or brackets
  if (!/^user_[A-Za-z0-9]+$/.test(userId)) return "missing";
  const { userId: me } = await auth();
  if (!me) return null;
  const db = await supabase();
  // These filters pick *this person's* profile, friendship row and posts out
  // of what I'm allowed to read (every profile; only friendships I'm in; only
  // my own and my friends' posts). They select, they don't stand in for a policy.
  const [profile, friendship, posts, books] = await Promise.all([
    db.from("profiles").select("user_id, display_name, avatar").eq("user_id", userId).maybeSingle(),
    db
      .from("friendships")
      .select("id, requester_id, status")
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .maybeSingle(),
    postQuery(db).eq("user_id", userId).order("created_at", { ascending: false }),
    myBookKeys(db),
  ]);
  const failed = profile.error ?? friendship.error ?? posts.error ?? books.error;
  if (failed) {
    console.error("Couldn't read person:", failed.message);
    return null;
  }
  if (!profile.data) return "missing";
  const saved = new Set((books.data ?? []).map((b) => b.ol_key));
  return {
    person: {
      userId: profile.data.user_id,
      name: profile.data.display_name,
      avatar: profile.data.avatar,
      ...connection(friendship.data, me),
    },
    readAt: Date.now(),
    posts: (posts.data ?? []).map((p) => toFeedPost(p, me, saved)),
  };
}

// How many friend requests are waiting on you, for the badge on the People
// tab. 0 when signed out (without asking the database) or if anything fails,
// since a missing badge is better than a broken nav.
export async function getPendingRequestCount(): Promise<number> {
  // Outside the try, so Next's own request-time signals from auth() pass through
  const { userId } = await auth();
  if (!userId) return 0;
  try {
    const db = await supabase();
    // The addressee filter picks the direction (people who asked *me*, not
    // people I asked). The "read my friendships" policy already limits rows to
    // ones I'm in.
    const { count, error } = await db
      .from("friendships")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .eq("addressee_id", userId);
    if (error) {
      console.error("Couldn't count friend requests:", error.message);
      return 0;
    }
    return count ?? 0;
  } catch (error) {
    console.error("Couldn't count friend requests:", error);
    return 0;
  }
}
