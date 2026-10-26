"use client";

import { useSignIn } from "@clerk/nextjs";
import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState, useSyncExternalStore } from "react";
import { hasPasskeyHere, rememberEmail, rememberPasskeyHere, savedEmail } from "@/lib/store";
import { Button, Field, TextLink } from "./ui";

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

// Whether a Clerk error is (or contains) this code. API errors carry their
// codes in a list.
function hasCode(error: unknown, code: string) {
  if (isClerkAPIResponseError(error)) return error.errors.some((e) => e.code === code);
  return (error as { code?: string } | null)?.code === code;
}

// Once Clerk says the sign-in is complete: make the session active and go on
// to the page you came from (or the feed).
function useFinishSignIn() {
  const { signIn } = useSignIn();
  const router = useRouter();
  const searchParams = useSearchParams();
  return async function finish() {
    const destination = safeDestination(searchParams.get("redirect_url"));
    await signIn.finalize({
      navigate: ({ decorateUrl }) => {
        const url = decorateUrl(destination);
        if (url.startsWith("http")) window.location.href = url;
        else router.push(url);
      },
    });
  };
}

// Signing in with a passkey: one tap, then your face or finger. Browsers only
// open the Face ID / Touch ID sheet after a tap, so it has to be a button.
function usePasskeySignIn() {
  const { signIn } = useSignIn();
  const finish = useFinishSignIn();
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
      setError("That didn't work. Sign in with an email code below instead.");
      return;
    }
    if (signIn.status !== "complete") {
      setBusy(false);
      setError("Almost there. Finish signing in with an email code below.");
      return;
    }
    // It worked, so this device has a passkey: no need to offer to add one,
    // and next time the passkey button comes first
    rememberPasskeyHere();
    await finish();
  }

  return { start, busy, error };
}

// kinnect's own email-code form, instead of Clerk's <SignIn />. Clerk's form
// switches to "use your passkey" after the email step whenever the account
// has a passkey anywhere, which on a device without one only opens Safari's
// "no passkeys saved" sheet. This one only ever sends a code. It also uses a
// real email field and a one-time-code field, so Safari can fill in your
// email and the code from Mail.
function EmailCodeSignIn() {
  const { signIn } = useSignIn();
  const finish = useFinishSignIn();
  const remembered = useSyncExternalStore(noSubscribe, savedEmail, () => "");
  const [typed, setTyped] = useState<string | null>(null);
  const email = typed ?? remembered;
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const codeBox = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const emailBox = useRef<HTMLInputElement & HTMLTextAreaElement>(null);

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    const address = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      setError("Enter the email you signed up with, like name@example.com.");
      emailBox.current?.focus();
      return;
    }
    setBusy(true);
    setError(undefined);
    const { error } = await signIn.emailCode.sendCode({ emailAddress: address });
    setBusy(false);
    if (error) {
      setError(
        hasCode(error, "form_identifier_not_found")
          ? "No kinnect account uses that email. Check it, or make an account below."
          : "Couldn't send a code. Check the email and try again.",
      );
      emailBox.current?.focus();
      return;
    }
    setSentTo(address);
    setCode("");
    // The code box replaces the email box; move focus there
    setTimeout(() => codeBox.current?.focus(), 0);
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    const digits = code.replace(/\D/g, "");
    if (digits.length !== 6) {
      setError("Enter the 6-digit code from the email.");
      codeBox.current?.focus();
      return;
    }
    setBusy(true);
    setError(undefined);
    const { error } = await signIn.emailCode.verifyCode({ code: digits });
    if (error || signIn.status !== "complete") {
      setBusy(false);
      setError(
        hasCode(error, "verification_expired")
          ? "That code has expired. Send a new one."
          : "That code didn't work. Check it, or send a new one.",
      );
      codeBox.current?.focus();
      return;
    }
    rememberEmail(sentTo!);
    await finish();
  }

  if (sentTo) {
    return (
      <form onSubmit={verify} noValidate className="grid gap-4">
        <Field
          ref={codeBox}
          label="6-digit code"
          hint={`We emailed a code to ${sentTo}.`}
          error={error}
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            if (error) setError(undefined);
          }}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={8}
        />
        <Button type="submit" disabled={busy} className="min-h-12 w-full">
          {busy ? "Signing in…" : "Sign in"}
        </Button>
        <div className="flex flex-wrap justify-between gap-2">
          <Button variant="quiet" disabled={busy} onClick={() => sendCode()} className="-ml-2 text-[15px]">
            Send a new code
          </Button>
          <Button
            variant="quiet"
            disabled={busy}
            onClick={() => {
              setSentTo(null);
              setError(undefined);
              setTimeout(() => emailBox.current?.focus(), 0);
            }}
            className="-mr-2 text-[15px]"
          >
            Use a different email
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={sendCode} noValidate className="grid gap-4">
      <Field
        ref={emailBox}
        label="Email"
        error={error}
        value={email}
        onChange={(e) => {
          setTyped(e.target.value);
          if (error) setError(undefined);
        }}
        type="email"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
      />
      <Button type="submit" disabled={busy} className="min-h-12 w-full">
        {busy ? "Sending…" : "Email me a code"}
      </Button>
      <p className="text-center text-[15px] text-muted">
        New here? <TextLink href="/sign-up">Make an account</TextLink>
      </p>
    </form>
  );
}

// The sign-in page. On a device that has used a passkey here before, a big
// "Sign in with passkey" button comes first, with the email code below.
// Anywhere else, only the email code: offering a passkey that isn't there
// just opens Safari's "no passkeys saved" sheet. A passkey belongs to an
// account, so it can only be made once you're signed in; the line under the
// form says so, and PasskeyPrompt offers it at the top of the next page.
export function SignInOptions() {
  const supported = useSyncExternalStore(noSubscribe, browserHasPasskeys, () => false);
  const here = useSyncExternalStore(noSubscribe, hasPasskeyHere, () => false);
  const passkey = usePasskeySignIn();
  const passkeyFirst = supported && here;

  return (
    <section aria-labelledby="sign-in-heading" className="mx-auto grid w-full max-w-[25rem] gap-4">
      <h1 id="sign-in-heading" tabIndex={-1} className="text-3xl font-semibold tracking-tight">
        {passkeyFirst ? "Welcome back" : "Sign in"}
      </h1>
      {passkeyFirst && (
        <>
          <Button onClick={passkey.start} disabled={passkey.busy} className="min-h-14 w-full text-[17px]">
            {passkey.busy ? "Waiting for your device…" : "Sign in with passkey"}
          </Button>
          {passkey.error && (
            <p role="alert" className="text-danger">
              {passkey.error}
            </p>
          )}
          <p className="flex items-center gap-3 text-[15px] text-muted before:h-px before:flex-1 before:bg-rule after:h-px after:flex-1 after:bg-rule">
            or use an email code
          </p>
        </>
      )}
      <EmailCodeSignIn />
      {supported && !passkeyFirst && (
        <p className="text-center text-[15px] text-muted">
          Once you&apos;re in, you can add a passkey and use Face ID or your fingerprint next time.
        </p>
      )}
    </section>
  );
}
