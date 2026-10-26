import { SignIn } from "@clerk/nextjs";
import { Suspense } from "react";
import { PasskeySignIn } from "@/components/PasskeySignIn";

// Passkey first, email code second. Both read the URL at request time, so they
// sit in Suspense for cacheComponents builds.
export default function SignInPage() {
  return (
    <div className="grid justify-items-center gap-4">
      <Suspense>
        <PasskeySignIn />
        <SignIn />
      </Suspense>
    </div>
  );
}
