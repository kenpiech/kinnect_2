"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import { rememberEmail } from "@/lib/store";

// Notes the signed-in person's email in this browser, so next time the
// sign-in form starts filled in (see savedEmail). Kept after signing out:
// that's when it's needed.
export function RememberEmail() {
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  useEffect(() => {
    if (email) rememberEmail(email);
  }, [email]);
  return null;
}
