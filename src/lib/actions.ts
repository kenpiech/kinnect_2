"use server";

import { auth } from "@clerk/nextjs/server";
import { refresh } from "next/cache";
import { OL_WORK_KEY, type Book } from "./books";
import { ensureProfile } from "./data";
import { supabase } from "./supabase";

// Server Actions: the browser calls these to change data. Every export here is
// a public POST endpoint that anyone can call with any arguments, so each one
// checks the session and treats its input as untrusted. Row-level security is
// the real lock; these checks just give a clear message instead of a database
// error.

export type ActionResult = { ok: true } | { ok: false; error: string };

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
