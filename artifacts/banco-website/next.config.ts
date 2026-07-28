import type { NextConfig } from "next";

function apiRewriteTarget(): string {
  const base = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080").replace(
    /\/+$/,
    "",
  );
  return base;
}

/**
 * CDN origin for the build's static assets (`/_next/static/*`) — infrastructure
 * only, never behaviour. Unset it is undefined and Next behaves exactly as today;
 * set, hashed immutable assets are served from the edge instead of the app
 * container. Same operator-env pattern as the Vite apps' BASE_PATH and the mobile
 * web export's EXPO_WEB_BASE_URL, so there is one way to do this in the monorepo.
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
