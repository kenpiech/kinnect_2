import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Who you are is decided here, before any page runs. Only the landing page
// and Clerk's own sign-in and sign-up pages are open; everything else sends a
// signed-out visitor to sign in. (What you may *see* is decided later, by
// row-level security in Supabase.)
const isPublicRoute = createRouteMatcher(["/", "/sign-in(.*)", "/sign-up(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) await auth.protect();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
