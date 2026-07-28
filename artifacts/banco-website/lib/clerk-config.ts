/** True when Clerk web auth is configured (W4+). CI builds without a key stay public-only. */
export function isClerkConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim());
}

export function getClerkPublishableKey(): string | null {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim();
  return key || null;
}

export function getClerkProxyUrl(): string | undefined {
  const proxy = process.env.NEXT_PUBLIC_CLERK_PROXY_URL?.trim();
  return proxy || undefined;
}

export function signInPath(locale: "ar" | "en" = "ar"): string {
  return locale === "en" ? "/en/sign-in" : "/sign-in";
}

export function signUpPath(locale: "ar" | "en" = "ar"): string {
  return locale === "en" ? "/en/sign-up" : "/sign-up";
}

export function workspacePath(locale: "ar" | "en" = "ar"): string {
  return locale === "en" ? "/en/workspace" : "/workspace";
}

export function savedPath(locale: "ar" | "en" = "ar"): string {
  return locale === "en" ? "/en/saved" : "/saved";
}
