import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // Security headers on every response (added in the security review).
  // frame-ancestors 'none' and X-Frame-Options stop another site loading
  // kinnect in a hidden frame and tricking a signed-in classmate into
  // clicking Accept or Add friend (clickjacking). The rest are cheap
  // defaults: no MIME sniffing, and only our origin in the Referer header
  // sent to other sites (Open Library covers, Clerk).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
