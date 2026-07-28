import type { NextConfig } from "next";

function apiRewriteTarget(): string {
  const base = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080").replace(
    /\/+$/,
    "",
  );
  return base;
}

/**
 * CDN origin for the build's static assets (`/_next/static/*`).
 *
 * Performance infrastructure only — it changes WHERE hashed, immutable files are
 * fetched from, never what the app does. Unset, the value is undefined and Next
 * behaves exactly as it does today, so local dev and any deployment without a CDN
 * are untouched. Set to a CDN origin, every hashed asset is served from the edge
 * instead of the app container, which is the whole point: those files already
 * carry immutable cache headers, so they are the cheapest possible thing to move
 * off the origin.
 *
 * Never hardcoded — same operator-env pattern the Vite apps use for BASE_PATH and
 * the mobile web export uses for EXPO_WEB_BASE_URL, so the monorepo has one way
 * of doing this rather than three.
 */
const assetCdnOrigin = process.env.NEXT_PUBLIC_ASSET_CDN_URL?.trim().replace(
  /\/+$/,
  "",
);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  ...(assetCdnOrigin ? { assetPrefix: assetCdnOrigin } : {}),
  // Allow Replit's proxied preview (cross-origin iframe) to load /_next/* assets
  allowedDevOrigins: ["*"],
  // Allow Server Actions from Replit proxy (port mismatch in x-forwarded-host vs origin)
  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost:3000",
        "127.0.0.1:3000",
        process.env.REPLIT_DOMAINS ?? "",
        `${process.env.REPLIT_DOMAINS ?? ""}:6800`,
      ].filter(Boolean),
    },
  },
  transpilePackages: [
    "@workspace/design-tokens",
    "@workspace/search-contract",
    "@workspace/taxonomy",
    "@workspace/api-client-react",
  ],
  ...(process.env.NEXT_STANDALONE === "true" ? { output: "standalone" as const } : {}),
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
        ],
      },
    ];
  },
  async rewrites() {
    const apiBase = apiRewriteTarget();
    return [
      {
        source: "/api/:path*",
        destination: `${apiBase}/api/:path*`,
      },
      {
        source: "/l/:id",
        destination: `${apiBase}/l/:id`,
      },
    ];
  },
};

export default nextConfig;
