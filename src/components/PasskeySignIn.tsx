"use client";

import { useSignIn } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { rememberPasskeyHere } from "@/lib/store";
import { Button } from "./ui";

const noSubscribe = () => () => {};
const browserHasPasskeys = () => typeof window.PublicKeyCredential !== "undefined";

// Where to go after signing in: the page the proxy bounced you from, but only
// if it's on kinnect itself, so a crafted link can't send you to another site.
// Checking the origin isn't enough: https://kinnect…//evil.com has our origin
// but the path "//evil.com", which a browser reads as another site. So the
// path must start with exactly one slash. (Found in the security review.)
function safeDestination(redirectUrl: string | null) {
  if (!redirectUrl) return "/feed";
  try {
    const url = new URL(redirectUrl, window.location.origin);
    if (url.origin !== window.location.origin || url.pathname.startsWith("//")) return "/feed";
    return url.pathname + url.search;
  } catch {
    return "/feed";
  }
}

// The big "Sign in with passkey" button above Clerk's email form. Browsers
// only open the Face ID / Touch ID sheet after a tap, so this is the fastest
// sign-in a page can offer: one tap, then your face or finger.
export function PasskeySignIn() {
  const { signIn } = useSignIn();
  const router = useRouter();
  const searchParams = useSearchParams();
  const supported = useSyncExternalStore(noSubscribe, browserHasPasskeys, () => false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!supported) return null;

  async function signInWithPasskey() {
    setBusy(true);
    setError(null);
    const { error } = await signIn.passkey({ flow: "discoverable" });
    if (error) {
      setBusy(false);
      // Closing the Face ID sheet isn't an error worth a message
      if (error.code === "passkey_retrieval_cancelled" || error.code === "passkey_operation_aborted") return;
      setError("That didn't work. If this device has no kinnect passkey yet, sign in with an email code below.");
      return;
    }
    if (signIn.status !== "complete") {
      setBusy(false);
      setError("Almost there. Finish signing in with an email code below.");
      return;
    }
    // It worked, so this device has a passkey: no need to offer to add one
    rememberPasskeyHere();
    const destination = safeDestination(searchParams.get("redirect_url"));
    await signIn.finalize({
      navigate: ({ decorateUrl }) => {
        const url = decorateUrl(destination);
        if (url.startsWith("http")) window.location.href = url;
        else router.push(url);
      },
    });
  }

  return (
    <section aria-labelledby="passkey-heading" className="mx-auto grid w-full max-w-[25rem] gap-3">
      <h1 id="passkey-heading" tabIndex={-1} className="text-3xl font-semibold tracking-tight">
        Welcome back
      </h1>
      <Button onClick={signInWithPasskey} disabled={busy} className="min-h-14 w-full text-[17px]">
        {busy ? "Waiting for your device…" : "Sign in with passkey"}
      </Button>
      <p className="text-center text-[15px] text-muted">Face ID, Touch ID or your fingerprint</p>
      {error && (
        <p role="alert" className="text-danger">
          {error}
        </p>
      )}
      <p className="mt-3 flex items-center gap-3 text-[15px] text-muted before:h-px before:flex-1 before:bg-rule after:h-px after:flex-1 after:bg-rule">
        or use an email code
      </p>
    </section>
  );
}
