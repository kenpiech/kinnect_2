import "server-only";
import { auth, currentUser } from "@clerk/nextjs/server";
import type { LibraryItem } from "./database.types";
import { supabase } from "./supabase";

// Reads and server-side writes for server components. These aren't Server
// Actions (no "use server"), so the browser can't call them directly.
//
// Queries rely on row-level security to pick out the signed-in person's rows.
// Don't add .eq("user_id", …) filters that repeat a policy: the Playwright
// test proves the policies work, and a duplicate filter would hide a broken one.

// Gives the signed-in person a profile, so classmates can find them on People.
// Runs on every full page load, but only writes the first time.
export async function ensureProfile() {
  const { userId } = await auth();
  if (!userId) return;

  const db = await supabase();
  // Everyone signed in can read every profile, so this filter is how we find
  // our own row, not a repeat of a policy
  const { data: existing, error: readError } = await db
    .from("profiles")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (readError) {
    console.error("Couldn't read profile:", readError.message);
    return;
  }
  if (existing) return;

  const user = await currentUser();
  const displayName = user?.fullName?.trim() || user?.firstName?.trim() || "New reader";
  // user_id fills itself in from the session token
  const { error } = await db.from("profiles").insert({ display_name: displayName });
  // 23505: another tab created it a moment ago
  if (error && error.code !== "23505") console.error("Couldn't create profile:", error.message);
}

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
  // How you're connected: not yet, you asked them, they asked you, or friends
  status: "none" | "sent" | "received" | "friends";
  // The friendship row, for Accept and Remove
  friendshipId: string | null;
};

// Everyone on lib2 but you, with how each of them is connected to you.
// Profiles are readable by anyone signed in; friendships come back only when
// you're one of the two people, thanks to "read my friendships". Null means
// Supabase couldn't be reached.
export async function getPeople(): Promise<Person[] | null> {
  const { userId } = await auth();
  if (!userId) return null;
  const db = await supabase();
  const [profiles, friendships] = await Promise.all([
    db.from("profiles").select("user_id, display_name").order("display_name"),
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
      return { userId: p.user_id, name: p.display_name, status, friendshipId: f?.id ?? null };
    });
}
