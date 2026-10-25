import { currentUser } from "@clerk/nextjs/server";
import { ensureProfile } from "@/lib/data";
import { AvatarGate } from "./AvatarPicker";

// Mounted once in the layout, in Suspense: it reads the session, which is
// only known at request time. Makes sure you have a profile, and until you've
// picked an avatar, shows the picker over the page.
export async function ProfileSync() {
  const profile = await ensureProfile();
  if (!profile || profile.avatar) return null;
  const user = await currentUser();
  return <AvatarGate name={user?.firstName ?? "reader"} />;
}
