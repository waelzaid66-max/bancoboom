"use client";

import { useCallback, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { searchUiCopy } from "../lib/search-ui-copy";
import { useSearchLocale } from "../lib/use-search-locale";

const buttonStyle: React.CSSProperties = {
  border: "1px solid var(--banco-border)",
  borderRadius: 10,
  background: "transparent",
  color: "var(--banco-fg)",
  padding: "0.6rem 0.9rem",
  fontWeight: 600,
  cursor: "pointer",
  fontSize: "0.9rem",
};

export function SearchCopyUrlButton() {
  const locale = useSearchLocale();
  const copy = searchUiCopy(locale);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [copied, setCopied] = useState(false);

  const copyUrl = useCallback(async () => {
    if (typeof window === "undefined") return;
    const qs = searchParams.toString();
    const url = `${window.location.origin}${pathname}${qs ? `?${qs}` : ""}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [pathname, searchParams]);

  return (
    <button type="button" style={buttonStyle} onClick={() => void copyUrl()}>
      {copied ? copy.copied : copy.copyUrl}
    </button>
  );
}
