import type { Metadata, Viewport } from "next";
import { Literata } from "next/font/google";
import { NavBar, RouteFocus, TabBar } from "@/components/NavBar";
import { Session } from "@/components/Session";
import "./globals.css";

const literata = Literata({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-literata" });

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#f3eddf", colorScheme: "light" };

export const metadata: Metadata = {
  title: "Kinnect",
  description: "Add friends and read what they post. Text only.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${literata.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col pb-[calc(3.5rem+env(safe-area-inset-bottom))] font-sans sm:pb-0">
        <NavBar />
        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:py-8">
          <Session />
          {children}
        </main>
        <footer className="border-t border-rule">
          <p className="mx-auto max-w-2xl px-4 py-4 text-[15px] italic text-muted">
            Sample friends · saved on this device
          </p>
        </footer>
        <TabBar />
        <RouteFocus />
      </body>
    </html>
  );
}
