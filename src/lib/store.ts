"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { people, personByHandle, seedPosts, type SeedPost } from "@/data/people";

// The only code that touches localStorage. Everything lib2 remembers lives
// under one versioned key, so a real database can replace this file later
// without the pages changing.

const KEY = "kinnect:v1";
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
// Fast-forward for testing: one sample day every 20 seconds
export const FAST_SPEED = DAY / 20_000;

export type MyPost = { id: string; text: string; createdAt: number };

// lib2 keeps its own clock so it can fast-forward for testing. Sample time
// = anchorSample + (real time since anchorReal) × speed. At speed 1 it's just
// the real time. Every timestamp saved below is in sample time.
export type Clock = { anchorReal: number; anchorSample: number; speed: number };

export type State = {
  firstVisit: number | null;
  // When you last left lib2, and when you left it before this visit
  lastSeen: number | null;
  previousVisit: number | null;
  name: string;
  friends: string[]; // handles, in the order you added them
  myPosts: MyPost[];
  // A post you started and haven't published yet
  draft: string;
  // A one-time message for the next page to show, e.g. after adding a friend
  flash: string | null;
  clock: Clock;
};

export type FeedPost = {
  id: string;
  author: string; // a handle, or "me"
  text: string;
  at: number;
};

const empty: State = {
  firstVisit: null,
  lastSeen: null,
  previousVisit: null,
  name: "You",
  friends: [],
  myPosts: [],
  draft: "",
  flash: null,
  clock: { anchorReal: 0, anchorSample: 0, speed: 1 },
};

let state: State = empty;
let loaded = false;
let storageOk = true;
let sessionStarted = false;
let sessionStart: number | null = null;
const listeners = new Set<() => void>();

function load() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) state = { ...empty, ...JSON.parse(raw) };
  } catch {
    storageOk = false;
  }
}

function save(next: State) {
  state = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Private browsing or blocked storage: keep working for this visit
    storageOk = false;
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Another tab changed something: reload from storage
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    loaded = false;
    load();
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot() {
  load();
  return state;
}

// Null on the server and during the first client render, so pages can show a
// placeholder instead of guessing and flashing the wrong screen.
export function useStore(): State | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}

export function isStorageOk() {
  return storageOk;
}

// The current time on lib2's clock.
export function sampleNow(s: State = state) {
  return s.clock.anchorSample + (Date.now() - s.clock.anchorReal) * s.clock.speed;
}

// Re-renders on a timer so new posts appear without a reload: every second in
// fast-forward, every half minute otherwise. Returns the clock's time.
export function useNow(s: State | null) {
  const [, setTick] = useState(0);
  const fast = !!s && s.clock.speed > 1;
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), fast ? 1000 : 30_000);
    return () => clearInterval(id);
  }, [fast]);
  return s ? sampleNow(s) : 0;
}

// Turns fast-forward on (FAST_SPEED) or off (1). Time carries on from where it
// is, so nothing jumps when you switch.
export function setSpeed(speed: number) {
  load();
  save({ ...state, clock: { anchorReal: Date.now(), anchorSample: sampleNow(), speed } });
}

// When this visit started, on lib2's clock. Posts newer than this arrived
// while you were here.
export function sessionStartedAt() {
  return sessionStart;
}

// Call when the app opens. Every fresh open (a new tab, reopening the app,
// a reload) is a new visit: it remembers when you last left, so the feed can
// welcome you back and show what's new since then. Moving between pages
// doesn't count. Only the first call per page load does anything.
export function startSession() {
  if (sessionStarted) return;
  sessionStarted = true;
  load();
  const s = state;
  const now = sampleNow(s);
  sessionStart = now;
  save({
    ...s,
    firstVisit: s.firstVisit ?? now,
    previousVisit: s.lastSeen,
    lastSeen: now,
  });
}

// Call when the page is hidden or closed, so "since your last visit" counts
// from when you left rather than when you arrived.
export function markSeen() {
  if (!loaded) return;
  save({ ...state, lastSeen: sampleNow() });
}

// When a sample post goes live. Day 0 posts land in the 24 hours before your
// first visit, so the network already has a history when you arrive.
export function visibleAt(post: SeedPost, firstVisit: number) {
  return firstVisit + (post.dayOffset - 1) * DAY + post.hour * HOUR;
}

// Everyone's posts that are live now, newest first. Used on the welcome screen.
export function livePosts(s: State, now = sampleNow(s)): FeedPost[] {
  const start = s.firstVisit ?? now;
  return seedPosts
    .map((p) => ({ id: p.id, author: p.author, text: p.text, at: visibleAt(p, start) }))
    .filter((p) => p.at <= now)
    .sort((a, b) => b.at - a.at);
}

// Your feed: your friends' live posts plus your own, newest first.
export function feed(s: State, now = sampleNow(s)): FeedPost[] {
  const friends = new Set(s.friends);
  const mine = s.myPosts.map((p) => ({ id: p.id, author: "me", text: p.text, at: p.createdAt }));
  return [...livePosts(s, now).filter((p) => friends.has(p.author)), ...mine].sort((a, b) => b.at - a.at);
}

// Friends' posts that went live since your previous visit.
export function newSinceLastVisit(s: State, now = sampleNow(s)): FeedPost[] {
  if (s.previousVisit === null) return [];
  return feed(s, now).filter((p) => p.author !== "me" && p.at > s.previousVisit!);
}

// "your last visit", "yesterday", "Sunday", "Oct 3": when you were last here, in words.
export function sinceWhen(at: number, now: number) {
  const day = (t: number) => new Date(t).setHours(0, 0, 0, 0);
  const days = Math.round((day(now) - day(at)) / DAY);
  if (now - at < HOUR) return "your last visit";
  if (days <= 0) return "earlier today";
  if (days === 1) return "yesterday";
  if (days < 7) return new Date(at).toLocaleDateString("en-US", { weekday: "long" });
  return new Date(at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function normalizeHandle(input: string) {
  return input.trim().replace(/^@/, "").replace(/\s+/g, " ").toLowerCase();
}

export type AddResult =
  | { ok: true; handle: string; postCount: number }
  | { ok: false; error: string; suggestion?: string };

// How many single-letter edits turn a into b.
function editDistance(a: string, b: string) {
  let row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) {
      next[j] = Math.min(row[j] + 1, next[j - 1] + 1, row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    row = next;
  }
  return row[b.length];
}

// The person whose handle or name is a near miss for what was typed, if any.
function closestPerson(typed: string) {
  let best: { handle: string; d: number } | null = null;
  for (const p of people) {
    for (const candidate of [p.handle, p.name.toLowerCase()]) {
      const d = editDistance(typed, candidate);
      if (d <= Math.max(2, Math.floor(candidate.length * 0.3)) && (!best || d < best.d)) best = { handle: p.handle, d };
    }
  }
  return best?.handle;
}

// Checks a typed handle (or full name) and adds that person. The error
// messages say what to do next.
export function addFriend(input: string): AddResult {
  const typed = normalizeHandle(input);
  if (!typed) return { ok: false, error: "Enter a name or handle, like @bunkerbill." };
  const person = personByHandle.get(typed) ?? people.find((p) => p.name.toLowerCase() === typed);
  if (!person) {
    const suggestion = closestPerson(typed);
    if (suggestion) {
      const name = personByHandle.get(suggestion)!.name;
      const meant = input.trim().startsWith("@") ? `@${suggestion} (${name})` : name;
      return { ok: false, error: `No one named “${input.trim()}”. Did you mean ${meant}?`, suggestion };
    }
    return { ok: false, error: `No one named “${input.trim()}”. Check the spelling or pick someone below.` };
  }
  const handle = person.handle;
  if (state.friends.includes(handle)) return { ok: false, error: `You're already friends with ${person.name}.` };

  const postCount = livePosts(state).filter((p) => p.author === handle).length;
  save({ ...state, friends: [...state.friends, handle] });
  return { ok: true, handle, postCount };
}

export function addAllFriends(handles: string[]) {
  const toAdd = handles.filter((h) => personByHandle.has(h) && !state.friends.includes(h));
  save({ ...state, friends: [...state.friends, ...toAdd] });
  return toAdd.length;
}

// Returns where they were in your list, so Undo can put them back there.
export function removeFriend(handle: string) {
  const index = state.friends.indexOf(handle);
  save({ ...state, friends: state.friends.filter((h) => h !== handle) });
  return index;
}

export function restoreFriend(handle: string, index: number) {
  if (state.friends.includes(handle)) return;
  const friends = [...state.friends];
  friends.splice(Math.max(0, index), 0, handle);
  save({ ...state, friends });
}

export const MAX_POST = 280;

export function addPost(text: string): { ok: true } | { ok: false; error: string } {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, error: "Write something before posting." };
  if (trimmed.length > MAX_POST) {
    const over = trimmed.length - MAX_POST;
    return { ok: false, error: `Cut ${over} character${over === 1 ? "" : "s"} to post.` };
  }
  const post = { id: `me-${Date.now()}`, text: trimmed, createdAt: sampleNow() };
  save({ ...state, myPosts: [...state.myPosts, post], draft: "" });
  return { ok: true };
}

// Saves what you're writing as you type, so leaving the page doesn't lose it.
export function setDraft(text: string) {
  load();
  if (text !== state.draft) save({ ...state, draft: text });
}

export function setName(name: string): { ok: true } | { ok: false; error: string } {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Enter a name, or use “You”." };
  if (trimmed.length > 40) return { ok: false, error: "Use 40 characters or fewer." };
  save({ ...state, name: trimmed });
  return { ok: true };
}

export function setFlash(message: string) {
  save({ ...state, flash: message });
}

export function takeFlash() {
  const message = state.flash;
  if (message) save({ ...state, flash: null });
  return message;
}

// Starts over as a first visit. Fast-forward stays as it was.
export function resetAll() {
  const now = Date.now();
  sessionStart = now;
  save({
    ...empty,
    firstVisit: now,
    lastSeen: now,
    clock: { anchorReal: now, anchorSample: now, speed: state.clock.speed },
  });
}
