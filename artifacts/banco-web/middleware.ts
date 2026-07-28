import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextFetchEvent, NextRequest } from "next/server";
import { isWebHealthPath } from "./lib/web-health";
import {
  isWebPlugEnabled,
  isWebPlugExemptPath,
  maintenancePathFor,
} from "./lib/web-plug-config";

const isProtectedRoute = createRouteMatcher([
  "/workspace(.*)",
  "/saved(.*)",
  "/en/workspace(.*)",
  "/en/saved(.*)",
]);

const clerkGuard = clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

/**
 * Phase 6 plug gate — runs before Clerk.
 * When WEB_PLUG_ENABLED=false, public traffic is rewritten to /maintenance.
 * /api/health and /api/healthz stay up so container/CDN probes still succeed.
 */
function plugGate(req: NextRequest): NextResponse | null {
  const pathname = req.nextUrl.pathname;
  const plugOn = isWebPlugEnabled();

  if (plugOn) {
    if (pathname === "/maintenance" || pathname === "/en/maintenance") {
      const home = pathname.startsWith("/en") ? "/en" : "/";
      return NextResponse.redirect(new URL(home, req.url));
    }
    return null;
  }

  // Plug OFF
  if (isWebHealthPath(pathname)) {
    const res = NextResponse.next();
    res.headers.set("X-Banco-Web-Plug", "off");
    return res;
  }

  if (pathname === "/maintenance" || pathname === "/en/maintenance") {
    const res = NextResponse.next();
    res.headers.set("X-Banco-Web-Plug", "off");
    res.headers.set("Retry-After", "300");
    return res;
  }

  if (isWebPlugExemptPath(pathname)) {
    const res = NextResponse.next();
    res.headers.set("X-Banco-Web-Plug", "off");
    return res;
  }

  const url = req.nextUrl.clone();
  url.pathname = maintenancePathFor(pathname);
  const res = NextResponse.rewrite(url);
  res.headers.set("Retry-After", "300");
  res.headers.set("X-Banco-Web-Plug", "off");
  return res;
}

// Clerk's publishable key is inlined at build time. When it is absent — the CI
// SEO/Lighthouse smoke, static previews, keyless local runs — clerkMiddleware
// throws on every request, so no page (not even the public home) can render.
// Fall back to a pass-through in that case so public pages stay servable;
// protected routes are still gated on every build that ships a key (all real
// production builds), so production behaviour is unchanged.
export default function middleware(req: NextRequest, event: NextFetchEvent) {
  const gated = plugGate(req);

  // Plug OFF (or maintenance redirect when ON): do not run Clerk on those responses.
  if (gated) {
    return gated;
  }

  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return NextResponse.next();
  }

  return clerkGuard(req, event);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
