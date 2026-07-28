import type { FeedItem } from "@workspace/api-client-react";

import {
  apiCategoryForUi,
  type UiListingCategory,
} from "@/constants/listingCreateTaxonomy";

/**
 * PREVIEW-ONLY display formatting (Task #37).
 *
 * The PUBLISHED buyer-facing card always renders the real BFF strings computed
 * server-side. This module reproduces those strings client-side ONLY to render
 * an honest live preview before publishing. It performs NO financial math — it
 * echoes the seller's own cash price and the lowest installment monthly they
 * typed. Two formatters are mirrored separately because the server uses two:
 *   - formatPriceDisplay   ← BffService.formatEGP     (price_display; M = 2 dp)
 *   - formatInstallmentEGP ← PaymentService.formatEGP (badge; M = 1 dp, plain K)
 * Keep these in lockstep with the server formatters if either ever changes.
 */

export function formatPriceDisplay(value: number): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2).replace(/\.00$/, "")}M EGP`;
  if (n >= 1_000) return `${Math.round(n / 1_000).toLocaleString("en-EG")}K EGP`;
  return `${n.toLocaleString("en-EG")} EGP`;
}

export function formatInstallmentEGP(value: number): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M EGP`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K EGP`;
  return `${n.toLocaleString("en-EG")} EGP`;
}

/**
 * Mirrors BffService.buildTrustSignal MINUS the server-only "Top Dealer" tier,
 * which requires a quality score the client cannot see. Under-promising here is
 * safe — a real Top Dealer simply previews as "Verified Dealer".
 */
export function buildPreviewTrustSignal(
  isVerified: boolean,
  role: string | null | undefined,
): string {
  if (isVerified && role === "dealer") return "Verified Dealer";
  if (isVerified && role === "company") return "Verified Company";
  if (isVerified && role === "financial_institution")
    return "Verified Financial Institution";
  if (isVerified) return "Verified Seller";
  return "Private Seller";
}

export interface PreviewDraft {
  uiCategory: UiListingCategory;
  title: string;
  location: string;
  /**
   * Cover/thumbnail uri. MUST be the seller's first IMAGE (never a video) so the
   * preview matches the published card, whose media_preview is always an image.
   */
  coverUri?: string | null;
  /** True when the draft includes at least one video — drives the play badge. */
  hasVideo?: boolean;
  cashPrice: number;
  /** Lowest seller-entered installment monthly payment (echoed, never computed). */
  lowestMonthly: number | null;
  hasInstallment: boolean;
  industrialType?: string | null;
  isVerified: boolean;
  role?: string | null;
  /**
   * True when this is a buyer "request/wanted" post. Mirrors the server: the
   * price line becomes "طلب سعر / Price requested" and installment badges are
   * suppressed (a request has no price to finance).
   */
  isRequest?: boolean;
}

/**
 * Builds a FeedItem identical in shape to what the buyer feed renders, so the
 * SmartAssetCard preview is faithful. Server-derived fields that cannot be
 * known before publishing are intentionally left empty/false (urgency_signal,
 * is_sponsored, best_offer_badge) rather than fabricated. `has_video` mirrors
 * the draft media (the server derives it the same way: any media item of type
 * "video"). The only input-derived badge reproduced is "Easy Installment".
 */
export function buildPreviewFeedItem(draft: PreviewDraft): FeedItem {
  // A buyer request has no sale price to finance, so suppress installment badges
  // and mirror the server's bilingual "price requested" line exactly.
  const installmentBadge =
    !draft.isRequest && draft.hasInstallment && draft.lowestMonthly != null
      ? `Starts from ${formatInstallmentEGP(draft.lowestMonthly)}/month`
      : null;

  return {
    id: "preview",
    media_preview: draft.coverUri ?? "",
    price_display: draft.isRequest
      ? "طلب سعر / Price requested"
      : formatPriceDisplay(draft.cashPrice),
    installment_badge: installmentBadge,
    title: draft.title,
    location: draft.location,
    urgency_signal: null,
    trust_signal: buildPreviewTrustSignal(draft.isVerified, draft.role),
    smart_badge: !draft.isRequest && draft.hasInstallment ? "Easy Installment" : null,
    has_video: draft.hasVideo ?? false,
    is_sponsored: false,
    coordinates: null,
    best_offer_badge: null,
    is_request: draft.isRequest ?? false,
    industrial_type:
      apiCategoryForUi(draft.uiCategory) === "industrial"
        ? draft.industrialType ?? null
        : null,
  };
}
