"use client";

import { UserButton, useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { ButtonLink } from "./ui";

const tabs = [
  { href: "/feed", label: "Feed" },
  { href: "/library", label: "Library" },
  { href: "/friends", label: "Friends" },
  { href: "/friends/add", label: "Add" },
  { href: "/me", label: "Me" },
];

function TabLinks({ mobile }: { mobile?: boolean }) {
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
export function NavBar() {
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
          Kinnect
        </Link>
        {isLoaded && isSignedIn && (
          <>
            <nav aria-label="Main" className="hidden sm:block">
              <TabLinks />
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
export function TabBar() {
  const { isSignedIn } = useAuth();
  if (!isSignedIn) return null;
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-rule bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
    >
      <TabLinks mobile />
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
    const id = requestAnimationFrame(() => {
      const main = document.getElementById("main");
      const active = document.activeElement;
      if (main && active && active !== main && main.contains(active)) return;
      // Next keeps visited pages mounted but hidden, so find the visible heading
      const h1 = [...document.querySelectorAll<HTMLElement>("main h1")].find((h) => h.offsetParent !== null);
      (h1 ?? main)?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [pathname]);

  return null;
}
