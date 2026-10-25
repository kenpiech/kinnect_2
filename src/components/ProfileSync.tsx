import { ensureProfile } from "@/lib/data";

// Mounted once in the layout, in Suspense: it reads the session, which is
// only known at request time. Renders nothing.
export async function ProfileSync() {
  await ensureProfile();
  return null;
}
