import { setBaseUrl } from "@workspace/api-client-react";
import { getApiBaseUrl } from "./site-env";

/**
 * Configure the generated API client base URL.
 *
 * - Server (RSC): absolute API host from NEXT_PUBLIC_API_URL
 * - Browser: same-origin `/api/*` via Next rewrites (or nginx in production)
 */
export function ensureApiClientConfigured(): void {
  const isBrowser = typeof window !== "undefined";
  setBaseUrl(isBrowser ? "" : getApiBaseUrl());
}
