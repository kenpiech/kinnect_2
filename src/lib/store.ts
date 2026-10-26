import { useSyncExternalStore } from "react";

// The only things kinnect keeps in the browser: the post you're still writing,
// so leaving Write doesn't lose it, a one-time message for the next page
// ("Posted…"), and whether this device has a passkey. Everything else lives
// in Supabase. Storage can be blocked (private browsing), so every read and
// write is allowed to fail quietly.

const DRAFT = "kinnect:draft";
const FLASH = "kinnect:flash";
const PASSKEY = "kinnect:passkey";
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

// Whether this browser has a kinnect passkey. Clerk knows how many passkeys
// your account has, but not which devices hold them, so a passkey made on a
// laptop would otherwise stop the phone from ever offering to make its own.
export function hasPasskeyHere() {
  return read(local(), PASSKEY) === "yes";
}

export function rememberPasskeyHere() {
  write(local(), PASSKEY, "yes");
}
