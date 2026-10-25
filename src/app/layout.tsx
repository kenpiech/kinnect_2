import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata, Viewport } from "next";
import { Literata } from "next/font/google";
import { Suspense } from "react";
import { NavBar, RouteFocus, TabBar } from "@/components/NavBar";
import { PasskeyPrompt } from "@/components/PasskeyPrompt";
import { ProfileSync } from "@/components/ProfileSync";
import "./globals.css";

const literata = Literata({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-literata" });

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#f3eddf", colorScheme: "light" };

export const metadata: Metadata = {
  title: "kinnect",
  description: "A small social network for your class, with a private reading library.",
};

// Clerk's sign-in and account screens in kinnect's paper, ink and oxblood
const clerkAppearance = {
  variables: {
    colorPrimary: "#8b2e1f",
    colorBackground: "#faf6ec",
    colorForeground: "#1f1b16",
    colorMutedForeground: "#635b4f",
    colorInput: "#faf6ec",
    colorInputForeground: "#1f1b16",
    colorBorder: "#8f8472",
    fontFamily: "var(--font-literata)",
    borderRadius: "1rem",
  },
};

// The nav reads the current path, which a catch-all route (like Clerk's
// sign-in) only knows at request time, so it sits in Suspense.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${literata.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col pb-[calc(3.5rem+env(safe-area-inset-bottom))] font-sans sm:pb-0">
        <ClerkProvider appearance={clerkAppearance}>
          <Suspense>
            <NavBar />
          </Suspense>
          <main id="main" tabIndex={-1} className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:py-8">
            <PasskeyPrompt />
            <Suspense>
              <ProfileSync />
            </Suspense>
            {children}
          </main>
          <footer className="border-t border-rule">
            <p className="mx-auto max-w-2xl px-4 py-4 text-[15px] italic text-muted">
              Your posts are for your friends. Your library is private.
            </p>
          </footer>
          <Suspense>
            <TabBar />
            <RouteFocus />
          </Suspense>
        </ClerkProvider>
      </body>
    </html>
  );
}
