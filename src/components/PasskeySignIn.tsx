"use client";

import { SignIn, useSignIn } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { hasPasskeyHere, rememberPasskeyHere, savedEmail } from "@/lib/store";
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

// Signing in with a passkey: one tap, then your face or finger. Browsers only
// open the Face ID / Touch ID sheet after a tap, so it has to be a button.
function usePasskeySignIn() {
  const { signIn } = useSignIn();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setBusy(true);
    setError(null);
    const { error } = await signIn.passkey({ flow: "discoverable" });
    if (error) {
      setBusy(false);
      // Closing the Face ID sheet isn't an error worth a message
      if (error.code === "passkey_retrieval_cancelled" || error.code === "passkey_operation_aborted") return;
      setError("That didn't work. If this device has no kinnect passkey yet, sign in with an email code.");
      return;
    }
    if (signIn.status !== "complete") {
      setBusy(false);
      setError("Almost there. Finish signing in with an email code.");
      return;
    }
    // It worked, so this device has a passkey: no need to offer to add one,
    // and next time the passkey button comes first
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

  return { start, busy, error };
}

// The sign-in page. On a device that has used a passkey here before, a big
// "Sign in with passkey" button comes first, with Clerk's email-code form
// below. Anywhere else, only the email code: offering a passkey that isn't
// there just opens a confusing "use another device" sheet. A passkey belongs
// to an account, so it can only be made once you're signed in; the line under
// the form says so, and PasskeyPrompt offers it at the top of the next page.
export function SignInOptions() {
  const supported = useSyncExternalStore(noSubscribe, browserHasPasskeys, () => false);
  const here = useSyncExternalStore(noSubscribe, hasPasskeyHere, () => false);
  const email = useSyncExternalStore(noSubscribe, savedEmail, () => "");
  const passkey = usePasskeySignIn();
  // Clerk reads initialValues once, so the key remounts it if the saved email
  // turns up after the first render
  const emailForm = <SignIn key={email} initialValues={{ emailAddress: email }} />;

  if (supported && here) {
    return (
      <>
        <section aria-labelledby="passkey-heading" className="mx-auto grid w-full max-w-[25rem] gap-3">
          <h1 id="passkey-heading" tabIndex={-1} className="text-3xl font-semibold tracking-tight">
            Welcome back
          </h1>
          <Button onClick={passkey.start} disabled={passkey.busy} className="min-h-14 w-full text-[17px]">
            {passkey.busy ? "Waiting for your device…" : "Sign in with passkey"}
          </Button>
          <p className="text-center text-[15px] text-muted">Face ID, Touch ID or your fingerprint</p>
          {passkey.error && (
            <p role="alert" className="text-danger">
              {passkey.error}
            </p>
          )}
          <p className="mt-3 flex items-center gap-3 text-[15px] text-muted before:h-px before:flex-1 before:bg-rule after:h-px after:flex-1 after:bg-rule">
            or use an email code
          </p>
        </section>
        {emailForm}
      </>
    );
  }

  return (
    <>
      {emailForm}
      {supported && (
        <p className="max-w-[25rem] text-center text-[15px] text-muted">
          Once you&apos;re in, you can add a passkey and use Face ID or your fingerprint next time.
        </p>
      )}
    </>
  );
}
