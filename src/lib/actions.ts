"use server";

import { auth } from "@clerk/nextjs/server";
import { refresh } from "next/cache";
import { isAvatar } from "./avatars";
import { OL_WORK_KEY, type Book } from "./books";
import { ensureProfile } from "./data";
import { MAX_POST, postLength } from "./posts";
import { supabase } from "./supabase";

// Server Actions: the browser calls these to change data. Every export here is
// a public POST endpoint that anyone can call with any arguments, so each one
// checks the session and treats its input as untrusted. Row-level security is
// the real lock; these checks just give a clear message instead of a database
// error.

// field says which part of the form an error belongs to, when it isn't the main one
export type ActionResult = { ok: true } | { ok: false; error: string; field?: "book" };

const SIGNED_OUT: ActionResult = { ok: false, error: "Your session ended. Sign in again, then retry." };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function text(value: unknown, max: number) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

function whole(value: unknown, min: number, max: number) {
  return Number.isInteger(value) && (value as number) >= min && (value as number) <= max ? (value as number) : null;
}

export async function saveBook(book: Book): Promise<ActionResult> {
  const { userId } = await auth();
  if (!userId) return SIGNED_OUT;

  const title = text(book?.title, 500);
  if (typeof book?.olKey !== "string" || !OL_WORK_KEY.test(book.olKey) || !title) {
    return { ok: false, error: "That book's details didn't come through. Search again and retry." };
  }
  // user_id fills itself in from the session token
  const row = {
    ol_key: book.olKey,
    title,
    author: text(book.author, 300),
    cover_id: whole(book.coverId, 1, 2_147_483_647),
    year: whole(book.year, -3000, 3000),
  };

  const db = await supabase();
  let { error } = await db.from("library_items").insert(row);
  // 23503: no profile yet (it's made on page load), so make it and retry once
  if (error?.code === "23503") {
    await ensureProfile();
    ({ error } = await db.from("library_items").insert(row));
  }
  // 23505: already in your library, which is what you wanted
  if (error && error.code !== "23505") {
    console.error("Couldn't save book:", error.message);
    return { ok: false, error: `Couldn't save ${title}. Try again.` };
  }
  refresh();
  return { ok: true };
}

export async function removeBook(id: string): Promise<ActionResult> {
  const { userId } = await auth();
  if (!userId) return SIGNED_OUT;
  if (typeof id !== "string" || !UUID.test(id)) return { ok: false, error: "Couldn't find that book. Reload and retry." };

  const db = await supabase();
  // Picks the row by its id. If it's someone else's, the "remove from my
  // library" policy makes this delete nothing.
  const { error } = await db.from("library_items").delete().eq("id", id);
  if (error) {
    console.error("Couldn't remove book:", error.message);
    return { ok: false, error: "Couldn't remove it. Try again." };
  }
  refresh();
  return { ok: true };
}

const CLERK_USER_ID = /^user_[A-Za-z0-9]+$/;

export async function sendFriendRequest(addresseeId: string): Promise<ActionResult> {
  const { userId } = await auth();
  if (!userId) return SIGNED_OUT;
  if (typeof addresseeId !== "string" || !CLERK_USER_ID.test(addresseeId) || addresseeId === userId) {
    return { ok: false, error: "Couldn't find that person. Reload and retry." };
  }
  const db = await supabase();
  // requester_id and status fill themselves in (me, pending), and the
  // "send a friend request" policy checks both
  let { error } = await db.from("friendships").insert({ addressee_id: addresseeId });
  // 23503 on your side: no profile yet, so make it and retry once
  if (error?.code === "23503") {
    await ensureProfile();
    ({ error } = await db.from("friendships").insert({ addressee_id: addresseeId }));
  }
  if (error?.code === "23505") return { ok: false, error: "You two are already connected, or one of you has asked. Reload to see." };
  if (error) {
    console.error("Couldn't send request:", error.message);
    return { ok: false, error: "Couldn't send the request. Try again." };
  }
  refresh();
  return { ok: true };
}

export async function acceptFriendRequest(friendshipId: string): Promise<ActionResult> {
  const { userId } = await auth();
  if (!userId) return SIGNED_OUT;
  if (typeof friendshipId !== "string" || !UUID.test(friendshipId)) return { ok: false, error: "Couldn't find that request. Reload and retry." };

  const db = await supabase();
  // Only status can be updated, and the "accept a request sent to me" policy
  // only matches pending requests where I'm the addressee
  const { data, error } = await db.from("friendships").update({ status: "accepted" }).eq("id", friendshipId).select("id");
  if (error) {
    console.error("Couldn't accept request:", error.message);
    return { ok: false, error: "Couldn't accept it. Try again." };
  }
  if (data.length === 0) return { ok: false, error: "That request is gone. It may have been cancelled." };
  refresh();
  return { ok: true };
}

// Decline, cancel and unfriend are all the same thing: the row goes away
export async function removeFriendship(friendshipId: string): Promise<ActionResult> {
  const { userId } = await auth();
  if (!userId) return SIGNED_OUT;
  if (typeof friendshipId !== "string" || !UUID.test(friendshipId)) return { ok: false, error: "Couldn't find that. Reload and retry." };

  const db = await supabase();
  const { error } = await db.from("friendships").delete().eq("id", friendshipId);
  if (error) {
    console.error("Couldn't remove friendship:", error.message);
    return { ok: false, error: "Couldn't do that. Try again." };
  }
  refresh();
  return { ok: true };
}

// A post, optionally about one book from your library. The book's title and
// author are copied from your library row here on the server, not taken from
// the page, so a post can only name a book you actually saved.
export async function createPost(input: { body: string; bookOlKey: string | null }): Promise<ActionResult> {
  const { userId } = await auth();
  if (!userId) return SIGNED_OUT;

  const body = typeof input?.body === "string" ? input.body.trim() : "";
  if (!body) return { ok: false, error: "Write something first." };
  const length = postLength(body);
  if (length > MAX_POST) return { ok: false, error: `Keep it to ${MAX_POST} characters. You're ${length - MAX_POST} over.` };

  const db = await supabase();
  let book: { ol_key: string; title: string; author: string | null } | null = null;
  if (input.bookOlKey !== null) {
    if (typeof input.bookOlKey !== "string" || !OL_WORK_KEY.test(input.bookOlKey)) {
      return { ok: false, error: "That book didn't come through. Pick it again.", field: "book" };
    }
    // The "read my library" policy keeps this to my own books; the ol_key
    // filter picks the one
    const { data, error } = await db
      .from("library_items")
      .select("ol_key, title, author")
      .eq("ol_key", input.bookOlKey)
      .maybeSingle();
    if (error) {
      console.error("Couldn't read library for post:", error.message);
      return { ok: false, error: "Couldn't post. Try again." };
    }
    if (!data) {
      return { ok: false, error: "That book isn't in your library anymore. Pick another, or post without one.", field: "book" };
    }
    book = data;
  }

  const row = { body, book_ol_key: book?.ol_key ?? null, book_title: book?.title ?? null, book_author: book?.author ?? null };
  let { error } = await db.from("posts").insert(row);
  if (error?.code === "23503") {
    await ensureProfile();
    ({ error } = await db.from("posts").insert(row));
  }
  if (error) {
    console.error("Couldn't create post:", error.message);
    return { ok: false, error: "Couldn't post. Try again." };
  }
  return { ok: true };
}

export async function deletePost(postId: string): Promise<ActionResult> {
  const { userId } = await auth();
  if (!userId) return SIGNED_OUT;
  if (typeof postId !== "string" || !UUID.test(postId)) return { ok: false, error: "Couldn't find that post. Reload and retry." };

  const db = await supabase();
  // If it isn't mine, the "delete my posts" policy makes this delete nothing
  const { error } = await db.from("posts").delete().eq("id", postId);
  if (error) {
    console.error("Couldn't delete post:", error.message);
    return { ok: false, error: "Couldn't delete it. Try again." };
  }
  refresh();
  return { ok: true };
}

// The name classmates see on People and on your posts
export async function updateDisplayName(name: string): Promise<ActionResult> {
  const { userId } = await auth();
  if (!userId) return SIGNED_OUT;
  const clean = typeof name === "string" ? name.trim().replace(/\s+/g, " ") : "";
  if (!clean) return { ok: false, error: "Type the name you'd like classmates to see." };
  if ([...clean].length > 80) return { ok: false, error: "Keep it to 80 characters." };

  const db = await supabase();
  // Supabase refuses an UPDATE with no filter, so this names my row; the
  // "rename my profile" policy would stop it touching anyone else's anyway
  const { error } = await db.from("profiles").update({ display_name: clean }).eq("user_id", userId);
  if (error) {
    console.error("Couldn't rename profile:", error.message);
    return { ok: false, error: "Couldn't save your name. Try again." };
  }
  refresh();
  return { ok: true };
}

// Pick one of the drawn avatars. The database checks the name too.
export async function setAvatar(avatar: string): Promise<ActionResult> {
  const { userId } = await auth();
  if (!userId) return SIGNED_OUT;
  if (!isAvatar(avatar)) return { ok: false, error: "Pick one of the avatars shown." };

  const db = await supabase();
  // Supabase refuses an UPDATE with no filter, so this names my row; the
  // "rename my profile" policy would stop it touching anyone else's anyway
  const { error } = await db.from("profiles").update({ avatar }).eq("user_id", userId);
  if (error) {
    console.error("Couldn't set avatar:", error.message);
    return { ok: false, error: "Couldn't save your avatar. Try again." };
  }
  refresh();
  return { ok: true };
}
