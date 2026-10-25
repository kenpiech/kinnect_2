import { createClerkClient } from "@clerk/backend";
import { clerkSetup } from "@clerk/testing/playwright";
import { test as setup } from "@playwright/test";
import { READERS } from "./readers";

// Runs once before the test. Fetches a Clerk testing token (so Clerk's bot
// protection lets the browser through), and makes sure the two test users
// exist. Their +clerk_test emails mark them as Clerk test accounts: no real
// email is ever sent.
setup("Clerk testing token and test users", async () => {
  await clerkSetup();

  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
  for (const reader of Object.values(READERS)) {
    const { data } = await clerk.users.getUserList({ emailAddress: [reader.email] });
    if (data.length === 0) {
      await clerk.users.createUser({
        emailAddress: [reader.email],
        firstName: reader.firstName,
        lastName: reader.lastName,
      });
    }
  }
});
