"use client";

import { useUser } from "@clerk/nextjs";
import { isClerkRuntimeError } from "@clerk/nextjs/errors";
import { useState, useSyncExternalStore } from "react";
import { hasPasskeyHere, rememberPasskeyHere } from "@/lib/store";
import { Banner, Button } from "./ui";

const noSubscribe = () => () => {};
const browserHasPasskeys = () => typeof window.PublicKeyCredential !== "undefined";

// kinnect has no passwords: you sign up with an emailed code, then add a
// passkey so later sign-ins are just Face ID, Touch ID or a fingerprint.
// Clerk's own "Add passkey" is three clicks deep in the account menu, so this
// offers it at the top of the page on any device without one. A passkey lives
// on a device (or syncs within one company's keychain), so one made in Chrome
// on a laptop doesn't help Safari on an iPhone: the prompt goes by this
// device, not by whether the account has a passkey somewhere. "Not now" hides
// it for this visit only: it's back after a reload or the next sign-in.
export function PasskeyPrompt() {
  const { isLoaded, user } = useUser();
  const supported = useSyncExternalStore(noSubscribe, browserHasPasskeys, () => false);
  const here = useSyncExternalStore(noSubscribe, hasPasskeyHere, () => true);
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState<"new" | "existing" | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (added) {
    return (
      <div className="mb-6">
        <Banner tone="accent" title={added === "new" ? "Passkey added" : "This device already has a passkey"}>
          <p>Next time, choose “Sign in with passkey” and use your face or fingerprint.</p>
          <Button variant="quiet" className="mt-2 -ml-2" onClick={() => setAdded(null)}>
            Done
          </Button>
        </Banner>
      </div>
    );
  }

  // Hidden once this device has a passkey, unless the account has none left
  // (say, it was deleted under Security)
  if (!isLoaded || !user || !supported || dismissed || (here && user.passkeys.length > 0)) return null;
  const elsewhere = user.passkeys.length > 0;

  async function addPasskey() {
    setBusy(true);
    setError(null);
    try {
      await user!.createPasskey();
      rememberPasskeyHere();
      setAdded("new");
    } catch (e) {
      // Closing the Face ID sheet isn't an error worth a message
      if (isClerkRuntimeError(e) && e.code === "passkey_registration_cancelled") return;
      // Its keychain already holds one (say, synced from another device)
      if (isClerkRuntimeError(e) && e.code === "passkey_already_exists") {
        rememberPasskeyHere();
        setAdded("existing");
        return;
      }
      setError("Couldn't add a passkey. Try again, or add one later from your account menu under Security.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-6">
      <Banner tone="accent" title="Skip the email code next time">
        <p>
          {elsewhere
            ? "Add a passkey on this device too, and sign in here with Face ID, Touch ID or your fingerprint."
            : "Add a passkey and sign in with Face ID, Touch ID or your fingerprint. No password, nothing to remember."}
        </p>
        {error && (
          <p role="alert" className="mt-2 text-danger">
            {error}
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button onClick={addPasskey} disabled={busy}>
            {busy ? "Waiting for your device…" : "Add a passkey"}
          </Button>
          <Button variant="quiet" onClick={() => setDismissed(true)} disabled={busy}>
            Not now
          </Button>
        </div>
      </Banner>
    </div>
  );
}
