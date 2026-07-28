"use client";

import { usePathname } from "next/navigation";
import { localeFromPathname } from "../lib/hub-config";

const LABELS = {
  ar: "تخطي إلى المحتوى",
  en: "Skip to main content",
} as const;

export function SkipToMain() {
  const pathname = usePathname() ?? "/";
  const locale = localeFromPathname(pathname);

  return (
    <a href="#main-content" className="skip-to-main">
      {LABELS[locale]}
    </a>
  );
}
