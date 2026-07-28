"use client";

import { useEffect } from "react";
import { writeStoredLocale } from "../lib/locale-preference";
import type { SiteLocale } from "../lib/hub-config";

type DocumentLocaleSyncProps = {
  lang: string;
  dir: "ltr" | "rtl";
};

/**
 * Keeps document-level lang/dir aligned on English routes while the root layout
 * stays statically Arabic for AR hubs. Improves a11y and client-side SEO signals.
 */
export function DocumentLocaleSync({ lang, dir }: DocumentLocaleSyncProps) {
  useEffect(() => {
    const root = document.documentElement;
    const previousLang = root.lang;
    const previousDir = root.dir;

    writeStoredLocale(lang as SiteLocale);
    root.lang = lang;
    root.dir = dir;

    return () => {
      root.lang = previousLang;
      root.dir = previousDir;
    };
  }, [lang, dir]);

  return null;
}
