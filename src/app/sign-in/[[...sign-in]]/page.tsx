import { SignIn } from "@clerk/nextjs";
import { Suspense } from "react";

// Clerk's catch-all sign-in page. It reads the URL at request time, so it sits
// in Suspense for cacheComponents builds.
export default function SignInPage() {
  return (
    <div className="flex justify-center">
      <Suspense>
        <SignIn />
      </Suspense>
    </div>
  );
}
