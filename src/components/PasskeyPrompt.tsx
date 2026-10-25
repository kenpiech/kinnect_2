"use client";

import { useUser } from "@clerk/nextjs";
import { isClerkRuntimeError } from "@clerk/nextjs/errors";
import { useState, useSyncExternalStore } from "react";
import { Banner, Button } from "./ui";

const noSubscribe = () => () => {};
const browserHasPasskeys = () => typeof window.PublicKeyCredential !== "undefined";

// kinnect has no passwords: you sign up with an emailed code, then add a
// passkey so later sign-ins are just Face ID, Touch ID or a fingerprint.
// Clerk's own "Add passkey" is three clicks deep in the account menu, so this
// offers it at the top of the page to anyone signed in without one. "Not now"
// hides it for this visit only: it's back after a reload or the next sign-in,
// until you add a passkey.
export function PasskeyPrompt() {
  const { isLoaded, user } = useUser();
  const supported = useSyncExternalStore(noSubscribe, browserHasPasskeys, () => false);
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (added) {
    return (
      <div className="mb-6">
        <Banner tone="accent" title="Passkey added">
          <p>Next time, choose “Sign in with passkey” and use your face or fingerprint.</p>
          <Button variant="quiet" className="mt-2 -ml-2" onClick={() => setAdded(false)}>
            Done
          </Button>
        </Banner>
      </div>
    );
  }

  if (!isLoaded || !user || !supported || dismissed || user.passkeys.length > 0) return null;

  async function addPasskey() {
    setBusy(true);
    setError(null);
    try {
      await user!.createPasskey();
      setAdded(true);
    } catch (e) {
      // Closing the Face ID sheet isn't an error worth a message
      if (isClerkRuntimeError(e) && e.code === "passkey_registration_cancelled") return;
      setError(
        isClerkRuntimeError(e) && e.code === "passkey_already_exists"
          ? "This device already has a passkey for kinnect. Use “Sign in with passkey” next time."
          : "Couldn't add a passkey. Try again, or add one later from your account menu under Security.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-6">
      <Banner tone="accent" title="Skip the email code next time">
        <p>Add a passkey and sign in with Face ID, Touch ID or your fingerprint. No password, nothing to remember.</p>
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
