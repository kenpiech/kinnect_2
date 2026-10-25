import { useSyncExternalStore } from "react";

// The only things lib2 keeps in the browser: the post you're still writing,
// so leaving Write doesn't lose it, and a one-time message for the next page
// ("Posted…"). Everything else lives in Supabase. Storage can be blocked
// (private browsing), so every read and write is allowed to fail quietly.

const DRAFT = "lib2:draft";
const FLASH = "lib2:flash";
const listeners = new Set<() => void>();

function read(store: Storage | undefined, key: string) {
  try {
    return store?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function write(store: Storage | undefined, key: string, value: string | null) {
  try {
    if (value === null || value === "") store?.removeItem(key);
    else store?.setItem(key, value);
  } catch {
    // Storage blocked: the draft lasts only as long as the page
  }
}

const local = () => (typeof window === "undefined" ? undefined : window.localStorage);
const session = () => (typeof window === "undefined" ? undefined : window.sessionStorage);

let draft: string | null = null;

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// The unsent post, the same in every tab of this browser
export function useDraft() {
  return useSyncExternalStore(
    subscribe,
    () => (draft ??= read(local(), DRAFT) ?? ""),
    () => "",
  );
}

export function setDraft(text: string) {
  draft = text;
  write(local(), DRAFT, text);
  listeners.forEach((l) => l());
}

// A message for the next page to show once, then forget
export function setFlash(message: string) {
  write(session(), FLASH, message);
}

export function takeFlash() {
  const message = read(session(), FLASH);
  write(session(), FLASH, null);
  return message;
}
