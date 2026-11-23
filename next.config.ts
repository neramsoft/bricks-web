import type { NextConfig } from "next";
import { allowLocalImages, mediaHosts } from "./src/lib/media-hosts";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const hosts = mediaHosts({
  API_URL: process.env.API_URL,
  MEDIA_PUBLIC_URL: process.env.MEDIA_PUBLIC_URL,
});

const config: NextConfig = {
  // The Docker image sets NEXT_OUTPUT=standalone; `next start` (local, CI) does not work with it.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  poweredByHeader: false,
  // `next dev` would write an AGENTS.md; the repository's own CLAUDE.md is the guide.
  agentRules: false,
  reactStrictMode: true,
  allowedDevOrigins: ["127.0.0.1"],
  images: {
    // In the Docker image these two are replaced when the container starts (docker/web-server.mjs).
    remotePatterns: hosts,
    // Only when every host is on this machine (development): see lib/media-hosts.ts.
    dangerouslyAllowLocalIP: allowLocalImages(hosts),
    // CMS pictures use a loader that returns the CMS's own variants (lib/image-variants.ts), so
    // the widths `next/image` asks for are the widths the CMS made.
    deviceSizes: [320, 640, 960, 1280, 1920, 2560],
    imageSizes: [],
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // A table's page follows the venue's state and holds an order's status: never stored, never
      // indexed (robots.txt is the CMS's and leaves it crawlable, so the crawler can read this).
      {
        source: "/s/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store" },
          { key: "X-Robots-Tag", value: "noindex, follow" },
        ],
      },
      // A preview shows a draft: never stored, never indexed.
      {
        source: "/preview",
        headers: [
          { key: "Cache-Control", value: "no-store" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default config;
