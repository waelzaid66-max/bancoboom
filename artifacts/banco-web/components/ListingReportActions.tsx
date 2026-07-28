"use client";

import { SignedIn, SignedOut } from "@clerk/nextjs";
import Link from "next/link";
import {
  CreateReportBodyReason,
  useCreateReport,
} from "@workspace/api-client-react";
import { useState } from "react";
import { signInPath, isClerkConfigured } from "../lib/clerk-config";
import { listingUiCopy } from "../lib/listing-ui-copy";
import { useSearchLocale } from "../lib/use-search-locale";

const REASONS: { key: CreateReportBodyReason; labelKey: keyof ReturnType<typeof listingUiCopy> }[] = [
  { key: CreateReportBodyReason.scam, labelKey: "reportReasonScam" },
  { key: CreateReportBodyReason.wrong_data, labelKey: "reportReasonWrongData" },
  { key: CreateReportBodyReason.fake_price, labelKey: "reportReasonFakePrice" },
  { key: CreateReportBodyReason.duplicate, labelKey: "reportReasonDuplicate" },
  { key: CreateReportBodyReason.other, labelKey: "reportReasonOther" },
];

const btnStyle: React.CSSProperties = {
  border: "1px solid var(--banco-border)",
  borderRadius: 8,
  background: "transparent",
  color: "var(--banco-muted)",
  padding: "0.35rem 0.65rem",
  fontSize: "0.85rem",
  cursor: "pointer",
};

type ListingReportActionsProps = {
  listingId: string;
};

export function ListingReportActions({ listingId }: ListingReportActionsProps) {
  const locale = useSearchLocale();
  const copy = listingUiCopy(locale);
  const clerkOn = isClerkConfigured();
  const createReport = useCreateReport();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"idle" | "submitting" | "done" | "error">("idle");

  if (!clerkOn) return null;

  const close = () => {
    if (state !== "submitting") {
      setOpen(false);
      setState("idle");
    }
  };

  const submit = (reason: CreateReportBodyReason) => {
    setState("submitting");
    createReport.mutate(
      { data: { listing_id: listingId, reason } },
      {
        onSuccess: () => setState("done"),
        onError: () => setState("error"),
      },
    );
  };

  return (
    <>
      <SignedIn>
        <button type="button" style={btnStyle} onClick={() => setOpen(true)}>
          {copy.reportCta}
        </button>
      </SignedIn>
      <SignedOut>
        <Link href={signInPath(locale)} style={{ ...btnStyle, textDecoration: "none", display: "inline-block" }}>
          {copy.reportCta}
        </Link>
      </SignedOut>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="report-dialog-title"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            display: "grid",
            placeItems: "center",
            background: "rgba(0,0,0,0.55)",
            padding: "1rem",
          }}
          onClick={close}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 420,
              background: "var(--banco-card)",
              border: "1px solid var(--banco-border)",
              borderRadius: 12,
              padding: "1.25rem",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="report-dialog-title" style={{ margin: "0 0 0.75rem", fontSize: "1.1rem" }}>
              {copy.reportTitle}
            </h2>

            {state === "done" ? (
              <p style={{ margin: 0, color: "var(--banco-fg)", lineHeight: 1.6 }}>{copy.reportDone}</p>
            ) : state === "error" ? (
              <p style={{ margin: 0, color: "var(--banco-primary)" }}>{copy.reportError}</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {REASONS.map(({ key, labelKey }) => (
                  <button
                    key={key}
                    type="button"
                    disabled={state === "submitting"}
                    onClick={() => submit(key)}
                    style={{
                      ...btnStyle,
                      textAlign: "start",
                      color: "var(--banco-fg)",
                      opacity: state === "submitting" ? 0.6 : 1,
                    }}
                  >
                    {copy[labelKey]}
                  </button>
                ))}
              </div>
            )}

            <div style={{ marginTop: "1rem", display: "flex", justifyContent: "flex-end" }}>
              <button type="button" style={btnStyle} onClick={close} disabled={state === "submitting"}>
                {copy.reportCancel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
