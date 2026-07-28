"use client";

import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { localeFromPathname, type SiteLocale } from "./hub-config";
import { LOCALE_STORAGE_KEY, readStoredLocale } from "./locale-preference";

function subscribe(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = (event: StorageEvent) => {
    if (event.key === LOCALE_STORAGE_KEY || event.key === null) onStoreChange();
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

function getSnapshot(): SiteLocale | null {
  return readStoredLocale();
}

function getServerSnapshot(): SiteLocale | null {
  return null;
}

function isLocaleNeutralPath(pathname: string): boolean {
  return pathname.startsWith("/listing/");
}

/**
 * `/en/*` → English; Arabic hub routes → Arabic; neutral `/listing/*` uses stored preference.
 */
export function useSearchLocale(): SiteLocale {
  const pathname = usePathname() ?? "/";
  const fromPath = localeFromPathname(pathname);
  const stored = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (fromPath === "en") return "en";
  if (isLocaleNeutralPath(pathname) && stored === "en") return "en";
  return "ar";
}
