// The two Clerk test users. Their emails still say lib2 (the app's name for
// a few days): they're existing Clerk accounts, and new emails would make a
// second pair of test users. They aren't friends, except for the few seconds
// tests/likes-comments.spec.ts makes them friends (it unfriends them after).
export const READERS = {
  a: { email: "lib2-reader-a+clerk_test@example.com", firstName: "Test", lastName: "Reader A" },
  b: { email: "lib2-reader-b+clerk_test@example.com", firstName: "Test", lastName: "Reader B" },
};
