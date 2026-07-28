"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import {
  getGetSellerReviewsQueryKey,
  useCreateSellerReview,
  useGetSellerReviews,
  type SellerReview,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { isClerkConfigured, signInPath } from "../lib/clerk-config";
import { listingUiCopy } from "../lib/listing-ui-copy";
import { useSearchLocale } from "../lib/use-search-locale";

const STAR_COLOR = "#F5A623";

const sectionStyle: React.CSSProperties = {
  marginTop: "1.25rem",
  paddingTop: "1.25rem",
  borderTop: "1px solid var(--banco-border)",
};

const btnStyle: React.CSSProperties = {
  border: "none",
  borderRadius: 8,
  background: "var(--banco-primary)",
  color: "#fff",
  padding: "0.45rem 0.85rem",
  fontWeight: 700,
  cursor: "pointer",
  fontSize: "0.85rem",
};

const ghostBtnStyle: React.CSSProperties = {
  border: "1px solid var(--banco-border)",
  borderRadius: 8,
  background: "transparent",
  color: "var(--banco-muted)",
  padding: "0.45rem 0.85rem",
  fontWeight: 600,
  cursor: "pointer",
  fontSize: "0.85rem",
};

function StarRow({ rating, size }: { rating: number; size: number }) {
  return (
    <span style={{ display: "inline-flex", gap: 2 }} aria-hidden>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} style={{ color: STAR_COLOR, fontSize: size, lineHeight: 1 }}>
          {i <= Math.round(rating) ? "★" : "☆"}
        </span>
      ))}
    </span>
  );
}

/** Compact rating chip — shares query key with full reviews section. */
export function ListingSellerRatingBar({ sellerId }: { sellerId: string }) {
  const locale = useSearchLocale();
  const copy = listingUiCopy(locale);

  const query = useGetSellerReviews(sellerId, {
    query: { enabled: !!sellerId, queryKey: getGetSellerReviewsQueryKey(sellerId) },
  });
  const summary = query.data?.data?.summary;
  if (!summary || summary.count < 1 || summary.average == null) return null;

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.5rem",
        marginTop: "0.5rem",
        padding: "0.35rem 0.65rem",
        borderRadius: 999,
        border: "1px solid var(--banco-border)",
        background: "var(--banco-card)",
        fontSize: "0.85rem",
      }}
      aria-label={copy.reviewsCount.replace("{count}", String(summary.count))}
    >
      <strong>{summary.average.toFixed(1)}</strong>
      <StarRow rating={summary.average} size={14} />
      <span style={{ color: "var(--banco-muted)" }}>
        {copy.reviewsCount.replace("{count}", String(summary.count))}
      </span>
    </div>
  );
}

type ListingSellerReviewsProps = {
  sellerId: string;
};

export function ListingSellerReviews({ sellerId }: ListingSellerReviewsProps) {
  const locale = useSearchLocale();
  const copy = listingUiCopy(locale);
  const { isSignedIn } = useAuth();
  const queryClient = useQueryClient();
  const clerkOn = isClerkConfigured();

  const query = useGetSellerReviews(sellerId, {
    query: { enabled: !!sellerId, queryKey: getGetSellerReviewsQueryKey(sellerId) },
  });
  const payload = query.data?.data;
  const items: SellerReview[] = payload?.items ?? [];
  const summary = payload?.summary;
  const canReview = payload?.can_review ?? false;
  const myRating = payload?.my_rating ?? null;

  const { mutate: submitReview, isPending } = useCreateSellerReview();

  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  const startEditing = () => {
    setRating(myRating ?? 0);
    setBody("");
    setError(null);
    setOpen(true);
  };

  const handleSubmit = () => {
    if (rating < 1) {
      setError(copy.reviewsRatingRequired);
      return;
    }
    setError(null);
    submitReview(
      { id: sellerId, data: { rating, body: body.trim() || null } },
      {
        onSuccess: () => {
          setOpen(false);
          setBody("");
          void queryClient.invalidateQueries({
            queryKey: getGetSellerReviewsQueryKey(sellerId),
          });
        },
        onError: () => setError(copy.reviewsError),
      },
    );
  };

  if (query.isLoading) {
    return (
      <section style={sectionStyle} aria-busy="true">
        <p style={{ margin: 0, color: "var(--banco-muted)" }}>{copy.reviewsLoading}</p>
      </section>
    );
  }
  if (query.isError) return null;

  return (
    <section style={sectionStyle} aria-labelledby="seller-reviews-heading">
      <h2 id="seller-reviews-heading" style={{ margin: "0 0 0.75rem", fontSize: "1.05rem" }}>
        {copy.reviewsTitle}
      </h2>

      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
        {summary && summary.count > 0 && summary.average != null ? (
          <>
            <span style={{ fontSize: "1.75rem", fontWeight: 700 }}>{summary.average.toFixed(1)}</span>
            <div>
              <StarRow rating={summary.average} size={16} />
              <p style={{ margin: "0.25rem 0 0", color: "var(--banco-muted)", fontSize: "0.85rem" }}>
                {copy.reviewsCount.replace("{count}", String(summary.count))}
              </p>
            </div>
          </>
        ) : (
          <p style={{ margin: 0, color: "var(--banco-muted)" }}>{copy.reviewsEmpty}</p>
        )}
      </div>

      {clerkOn && isSignedIn && canReview && !open ? (
        <button type="button" onClick={startEditing} style={{ ...ghostBtnStyle, marginTop: "0.75rem" }}>
          {myRating != null ? copy.reviewsEdit : copy.reviewsWrite}
        </button>
      ) : null}

      {clerkOn && isSignedIn && !canReview && myRating == null ? (
        <p style={{ margin: "0.75rem 0 0", color: "var(--banco-muted)", fontSize: "0.85rem" }}>
          {copy.reviewsNotEligible}
        </p>
      ) : null}

      {clerkOn && !isSignedIn ? (
        <p style={{ margin: "0.75rem 0 0", fontSize: "0.85rem" }}>
          <Link href={signInPath(locale)} style={{ color: "var(--banco-primary)", fontWeight: 600 }}>
            {copy.reviewsSignIn}
          </Link>
        </p>
      ) : null}

      {open ? (
        <div
          style={{
            marginTop: "0.75rem",
            padding: "0.85rem",
            borderRadius: "var(--banco-radius)",
            border: "1px solid var(--banco-border)",
            background: "var(--banco-card)",
            display: "flex",
            flexDirection: "column",
            gap: "0.65rem",
          }}
        >
          <p style={{ margin: 0, fontWeight: 600, fontSize: "0.9rem" }}>{copy.reviewsYourRating}</p>
          <div style={{ display: "flex", gap: "0.35rem" }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => setRating(i)}
                aria-label={`${i}`}
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: "1.5rem",
                  color: STAR_COLOR,
                  padding: 0,
                }}
              >
                {i <= rating ? "★" : "☆"}
              </button>
            ))}
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={copy.reviewsPlaceholder}
            rows={3}
            style={{
              width: "100%",
              border: "1px solid var(--banco-border)",
              borderRadius: 8,
              background: "var(--banco-card)",
              color: "var(--banco-fg)",
              padding: "0.55rem 0.65rem",
              fontSize: "0.9rem",
              resize: "vertical",
            }}
          />
          {error ? (
            <p style={{ margin: 0, color: "var(--banco-primary)", fontSize: "0.85rem" }}>{error}</p>
          ) : null}
          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
            <button type="button" onClick={() => setOpen(false)} style={ghostBtnStyle}>
              {copy.reviewsCancel}
            </button>
            <button type="button" onClick={handleSubmit} disabled={isPending} style={btnStyle}>
              {isPending ? copy.reviewsSubmitting : copy.reviewsSubmit}
            </button>
          </div>
        </div>
      ) : null}

      {items.length > 0 ? (
        <ul style={{ margin: "1rem 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          {items.map((r) => (
            <li key={r.id}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap" }}>
                <strong style={{ fontSize: "0.9rem" }}>{r.author_name}</strong>
                <StarRow rating={r.rating} size={13} />
              </div>
              {r.body ? (
                <p style={{ margin: "0.35rem 0 0", color: "var(--banco-muted)", lineHeight: 1.6, fontSize: "0.9rem" }}>
                  {r.body}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
