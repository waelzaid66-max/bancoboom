"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { alternateLocalePath, chromeCopy } from "../lib/chrome-copy";
import { localeFromPathname } from "../lib/hub-config";

const linkStyle: React.CSSProperties = {
  color: "var(--banco-muted)",
  textDecoration: "none",
  fontSize: "0.85rem",
  fontWeight: 600,
  border: "1px solid var(--banco-border)",
  borderRadius: 999,
  padding: "0.25rem 0.65rem",
};

export function LocaleSwitcher() {
  const pathname = usePathname() ?? "/";
  const locale = localeFromPathname(pathname);
  const copy = chromeCopy(locale);
  const href = alternateLocalePath(pathname);

  return (
    <Link href={href} hrefLang={locale === "en" ? "ar-EG" : "en"} style={linkStyle}>
      {copy.localeSwitch}
    </Link>
  );
}
