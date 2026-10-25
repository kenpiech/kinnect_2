import "server-only";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

// A Supabase client for one request, acting as whoever Clerk says is asking.
// Every query carries their Clerk session token, and row-level security in
// the database decides which rows come back. Signed out, there's no token,
// so queries run as anon, which has no access to any table.
//
// Server only. Pages and actions get data through src/lib/data.ts.
export async function supabase() {
  const { getToken } = await auth();
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    accessToken: () => getToken(),
  });
}
