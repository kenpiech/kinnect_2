import { SignUp } from "@clerk/nextjs";
import { Suspense } from "react";

// Clerk's catch-all sign-up page. It reads the URL at request time, so it sits
// in Suspense for cacheComponents builds.
export default function SignUpPage() {
  return (
    <div className="flex justify-center">
      <Suspense>
        <SignUp />
      </Suspense>
    </div>
  );
}
