import { Suspense } from "react";
import { SignInOptions } from "@/components/PasskeySignIn";

// Passkey or email code, in the order that suits this device (see
// SignInOptions). Both read the URL at request time, so they sit in Suspense
// for cacheComponents builds.
export default function SignInPage() {
  return (
    <div className="grid justify-items-center gap-4">
      <Suspense>
        <SignInOptions />
      </Suspense>
    </div>
  );
}
