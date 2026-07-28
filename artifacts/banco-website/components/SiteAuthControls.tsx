"use client";

import {
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import Link from "next/link";
import { isClerkConfigured, savedPath, signInPath, workspacePath } from "../lib/clerk-config";
import type { SiteLocale } from "../lib/hub-config";
import { workspaceUiCopy } from "../lib/workspace-ui-copy";

const btnStyle: React.CSSProperties = {
  border: "1px solid var(--banco-border)",
  borderRadius: 8,
  background: "transparent",
  color: "var(--banco-fg)",
  padding: "0.35rem 0.65rem",
  fontSize: "0.85rem",
  fontWeight: 600,
  cursor: "pointer",
  textDecoration: "none",
  display: "inline-block",
};

const primaryBtnStyle: React.CSSProperties = {
  ...btnStyle,
  background: "var(--banco-primary)",
  color: "#fff",
  borderColor: "var(--banco-primary)",
};

type SiteAuthControlsProps = {
  locale: SiteLocale;
};

export function SiteAuthControls({ locale }: SiteAuthControlsProps) {
  if (!isClerkConfigured()) return null;

  const copy = workspaceUiCopy(locale);
  const ws = workspacePath(locale);
  const saved = savedPath(locale);

  return (
    <>
      <SignedIn>
        <Link href={ws} style={btnStyle}>
          {copy.title}
        </Link>
        <Link href={saved} style={btnStyle}>
          {copy.navSaved}
        </Link>
        <UserButton afterSignOutUrl={locale === "en" ? "/en" : "/"} />
      </SignedIn>
      <SignedOut>
        <Link href={signInPath(locale)} style={primaryBtnStyle}>
          {copy.signInCta}
        </Link>
      </SignedOut>
    </>
  );
}
