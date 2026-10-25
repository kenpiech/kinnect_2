import { clerkMiddleware } from "@clerk/nextjs/server";

// A convenience, not the lock: signed-out visitors are sent to sign in before
// a page runs. Only the landing page and Clerk's sign-in and sign-up pages
// are open. The real checks sit next to the data, as Clerk now recommends
// (it deprecated createRouteMatcher because path matching can drift from how
// Next routes requests): every Server Action and /api route checks auth(),
// and row-level security in Supabase decides what anyone may see.
const isPublicRoute = (path: string) =>
  path === "/" || /^\/sign-(in|up)(\/|$)/.test(path);

export default clerkMiddleware(async (auth, req) => {
  // The landing page is for signed-out visitors; signed in, go to your feed
  if (req.nextUrl.pathname === "/") {
    const { userId } = await auth();
    if (userId) return Response.redirect(new URL("/feed", req.url));
    return;
  }
  if (isPublicRoute(req.nextUrl.pathname)) return;
  // APIs answer 401 rather than redirecting to the sign-in page, which a
  // fetch() in the browser can't do anything with
  if (req.nextUrl.pathname.startsWith("/api/")) {
    const { userId } = await auth();
    if (!userId) return Response.json({ error: "signed_out" }, { status: 401 });
    return;
  }
  await auth.protect();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
