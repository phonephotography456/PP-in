import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  poweredByHeader: false,
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        // Pre-launch / staging: keep the whole site out of search results until ALLOW_INDEXING=true at build time.
        ...(process.env.ALLOW_INDEXING === "true" ? [] : [{ key: "X-Robots-Tag", value: "noindex, nofollow" }]),
      ],
    }];
  },
  cacheComponents: true,
  // Public pages: served from memory for up to an hour, dropped after a day. Admin/photographer writes
  // invalidate the "public" tag immediately, so the long lifetime never shows stale approved data.
  cacheLife: { public: { stale: 300, revalidate: 3600, expire: 86400 } },
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
