import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Who you are is decided here, before any page runs. Only the landing page
// and Clerk's own sign-in and sign-up pages are open; everything else sends a
// signed-out visitor to sign in. (What you may *see* is decided later, by
// row-level security in Supabase.)
const isPublicRoute = createRouteMatcher(["/", "/sign-in(.*)", "/sign-up(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  // The landing page is for signed-out visitors; signed in, go to your feed
  if (req.nextUrl.pathname === "/") {
    const { userId } = await auth();
    if (userId) return Response.redirect(new URL("/feed", req.url));
    return;
  }
  if (isPublicRoute(req)) return;
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
