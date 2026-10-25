"use client";

import { UserButton, useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, use, useEffect, useRef } from "react";
import { plural } from "@/lib/format";
import { ButtonLink } from "./ui";

const tabs = [
  { href: "/feed", label: "Feed" },
  { href: "/library", label: "Library" },
  { href: "/people", label: "People" },
  { href: "/me", label: "Me" },
];

// requests: how many friend requests are waiting on you, streamed in from the
// layout. The People tab shows it as a badge.
type NavProps = { requests: Promise<number> };

// A small oxblood count on the People tab, hidden at 0. It loads on its own,
// so the tabs show straight away and the number pops in when it's ready.
function RequestBadge({ requests }: NavProps) {
  const count = use(requests);
  if (count === 0) return null;
  return (
    <span className="ml-1.5 inline-grid min-w-5 place-items-center rounded-full bg-accent px-1.5 text-xs leading-5 font-semibold text-paper">
      <span aria-hidden="true">{count > 9 ? "9+" : count}</span>
      <span className="sr-only">, {plural(count, "friend request")}</span>
    </span>
  );
}

function TabLinks({ mobile, requests }: NavProps & { mobile?: boolean }) {
  const pathname = usePathname();
  return (
    <ul className={mobile ? "mx-auto flex max-w-2xl" : "flex gap-5"}>
      {tabs.map(({ href, label }) => {
        const current = pathname === href;
        return (
          <li key={href} className={mobile ? "flex-1" : undefined}>
            <Link
              href={href}
              aria-current={current ? "page" : undefined}
              className={`label flex items-center justify-center ${
                mobile ? "min-h-14 border-t-[3px]" : "min-h-11 border-b-2"
              } ${current ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink"}`}
            >
              {label}
              {href === "/people" && (
                <Suspense>
                  <RequestBadge requests={requests} />
                </Suspense>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

// The top bar on every page. From the sm breakpoint up it holds the tabs too;
// on a phone they're in TabBar at the bottom instead. The current page is
// marked with the accent and aria-current. Signed out, it offers only sign in
// and sign up; signed in, the tabs, Write and Clerk's account menu (which has
// sign out). Until Clerk knows which, the right side stays empty.
export function NavBar({ requests }: NavProps) {
  const pathname = usePathname();
  const { isLoaded, isSignedIn } = useAuth();

  return (
    <header className="sticky top-0 z-20 border-b border-rule bg-paper">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-30 focus:bg-ink focus:px-4 focus:py-2 focus:text-paper"
      >
        Skip to content
      </a>
      <div className="mx-auto flex max-w-2xl items-center gap-6 px-4 py-2">
        <Link href="/" className="mr-auto py-1 text-2xl font-semibold italic tracking-tight">
          kinnect
        </Link>
        {isLoaded && isSignedIn && (
          <>
            <nav aria-label="Main" className="hidden sm:block">
              <TabLinks requests={requests} />
            </nav>
            <ButtonLink
              href="/post/new"
              aria-current={pathname === "/post/new" ? "page" : undefined}
              className="px-4 aria-[current=page]:ring-2 aria-[current=page]:ring-ink aria-[current=page]:ring-offset-2 aria-[current=page]:ring-offset-paper"
            >
              Write
            </ButtonLink>
            <div className="flex min-h-11 min-w-11 items-center justify-center">
              <UserButton />
            </div>
          </>
        )}
        {isLoaded && !isSignedIn && (
          <>
            <ButtonLink href="/sign-in" variant="quiet">
              Sign in
            </ButtonLink>
            <ButtonLink href="/sign-up" className="px-4">
              Sign up
            </ButtonLink>
          </>
        )}
      </div>
    </header>
  );
}

// Mobile first: on a phone the tabs sit in a bar at the bottom, where a thumb
// reaches them. It's last in the page, so Tab order matches what you see.
export function TabBar({ requests }: NavProps) {
  const { isSignedIn } = useAuth();
  if (!isSignedIn) return null;
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-rule bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
    >
      <TabLinks mobile requests={requests} />
    </nav>
  );
}

// After moving to another page, put focus on its heading so keyboard and
// screen reader users start at the top of the new page, unless the page
// already focused something itself (like the post box).
export function RouteFocus() {
  const pathname = usePathname();
  const previous = useRef(pathname);

  useEffect(() => {
    if (previous.current === pathname) return;
    previous.current = pathname;
    // Next keeps visited pages mounted but hidden, so find the visible heading
    const visibleHeading = () => [...document.querySelectorAll<HTMLElement>("main h1")].find((h) => h.offsetParent !== null);
    let focused: HTMLElement | undefined;
    let observer: MutationObserver | undefined;
    let stop: ReturnType<typeof setTimeout> | undefined;
    const id = requestAnimationFrame(() => {
      const main = document.getElementById("main");
      const active = document.activeElement;
      if (!main || (active && active !== main && main.contains(active))) return;
      focused = visibleHeading();
      (focused ?? main).focus();
      // A page that's still loading shows a placeholder heading. When the real
      // one replaces it, focus would fall to <body>, so follow it to the new
      // heading. Only then: never pull focus away from something you chose.
      observer = new MutationObserver(() => {
        if (focused && !focused.isConnected && document.activeElement === document.body) {
          focused = visibleHeading();
          focused?.focus();
        }
      });
      observer.observe(main, { childList: true, subtree: true });
      stop = setTimeout(() => observer?.disconnect(), 10_000);
    });
    return () => {
      cancelAnimationFrame(id);
      observer?.disconnect();
      clearTimeout(stop);
    };
  }, [pathname]);

  return null;
}
