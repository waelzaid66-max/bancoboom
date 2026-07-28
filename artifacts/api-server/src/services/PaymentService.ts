import type { PaymentOption } from "@workspace/db";

export interface NormalizedPayment {
  has_installment: boolean;
  options: {
    mode: string;
    down_payment: string | null;
    monthly_payment: string | null;
    duration_months: number | null;
    is_islamic_compliant: boolean;
  }[];
  lowest_monthly: string | null;
  lowest_down_payment: string | null;
  badge: string | null;
}

function formatEGP(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  if (isNaN(n)) return null;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M EGP`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K EGP`;
  return `${n.toLocaleString("en-EG")} EGP`;
}

export function normalizePaymentOptions(options: PaymentOption[]): NormalizedPayment {
  const installments = options.filter(
    (o) => o.mode !== "cash" && o.monthlyPayment != null
  );

  if (installments.length === 0) {
    return {
      has_installment: false,
      options: options.map((o) => ({
        mode: o.mode,
        down_payment: formatEGP(o.downPayment),
        monthly_payment: formatEGP(o.monthlyPayment),
        duration_months: o.durationMonths,
        is_islamic_compliant: o.isIslamicCompliant ?? false,
      })),
      lowest_monthly: null,
      lowest_down_payment: null,
      badge: null,
    };
  }

  const lowestMonthlyOpt = installments.reduce((best, curr) =>
    Number(curr.monthlyPayment) < Number(best.monthlyPayment) ? curr : best
  );

  const downPaymentOpts = installments.filter((o) => o.downPayment != null);
  const lowestDownOpt =
    downPaymentOpts.length > 0
      ? downPaymentOpts.reduce((best, curr) =>
          Number(curr.downPayment) < Number(best.downPayment) ? curr : best
        )
      : null;

  const lowestMonthlyFormatted = formatEGP(lowestMonthlyOpt.monthlyPayment);

  return {
    has_installment: true,
    options: options.map((o) => ({
      mode: o.mode,
      down_payment: formatEGP(o.downPayment),
      monthly_payment: formatEGP(o.monthlyPayment),
      duration_months: o.durationMonths,
      is_islamic_compliant: o.isIslamicCompliant ?? false,
    })),
    lowest_monthly: lowestMonthlyFormatted,
    lowest_down_payment: lowestDownOpt ? formatEGP(lowestDownOpt.downPayment) : null,
    badge: lowestMonthlyFormatted ? `Starts from ${lowestMonthlyFormatted}/month` : null,
  };
}

/* ── FINANCING ENGINE (additive) ─────────────────────────────────────────────
 * computeOffers turns raw payment_options rows into display-ready financing
 * offers and picks a single best offer. All money is pre-formatted here so the
 * client never calculates. Two financing models:
 *   - conventional: reducing-balance amortization from annualRatePct.
 *   - islamic: a fixed total = principal * (1 + profitRatePct/100); a flat
 *     monthly = total / months. NO rate/APR is ever emitted for Islamic offers
 *     (the Offer shape intentionally has no rate field at all).
 * When a rate column is absent we fall back to the stored monthlyPayment, so
 * user-created listings (which don't capture rates yet) still produce offers.
 * ─────────────────────────────────────────────────────────────────────────── */

export type FinancingType = "islamic" | "conventional";
export type OfferProvider = "seller" | "bank" | "dealer" | "supplier";

export interface ComputedOffer {
  id: string;
  financing_type: FinancingType;
  provider: OfferProvider;
  provider_badge: string;
  monthly_display: string;
  duration_months: number;
  down_payment_display: string | null;
  total_payable_display: string;
  is_best: boolean;
}

export interface OffersResult {
  offers: ComputedOffer[];
  best_offer: ComputedOffer | null;
  // Provider-tagged feed hook, e.g. "CIB Auto Finance · from 13K EGP/mo".
  best_offer_badge: string | null;
}

const PROVIDER_LABEL: Record<OfferProvider, string> = {
  seller: "Seller Plan",
  bank: "Bank Finance",
  dealer: "Dealer Finance",
  supplier: "Supplier Finance",
};

function providerBadge(
  provider: OfferProvider,
  providerName: string | null | undefined,
  isIslamic: boolean
): string {
  const base = providerName?.trim() || PROVIDER_LABEL[provider];
  return isIslamic ? `${base} · Islamic` : base;
}

// Standard reducing-balance monthly instalment for a fully-amortizing loan.
function amortizedMonthly(
  principal: number,
  annualRatePct: number,
  months: number
): number {
  if (months <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  if (r === 0) return principal / months;
  return (principal * r) / (1 - Math.pow(1 + r, -months));
}

function toFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function computeOffers(
  options: PaymentOption[],
  listingPriceCash: string | number
): OffersResult {
  const price = toFiniteNumber(listingPriceCash) ?? 0;

  const offers: ComputedOffer[] = [];
  // Parallel numeric array used only for best-offer selection — never emitted.
  const metrics: { monthly: number; total: number }[] = [];

  for (const o of options) {
    if (o.mode === "cash") continue;
    const months = o.durationMonths ?? 0;
    if (months <= 0) continue;

    const down = toFiniteNumber(o.downPayment) ?? 0;
    const principal = Math.max(price - down, 0);
    const isIslamic = o.isIslamicCompliant ?? false;
    const provider = (o.provider ?? "seller") as OfferProvider;

    let monthly: number;
    let totalFinanced: number;

    if (isIslamic) {
      const profit = toFiniteNumber(o.profitRatePct);
      if (profit !== null) {
        totalFinanced = principal * (1 + profit / 100);
        monthly = totalFinanced / months;
      } else {
        const stored = toFiniteNumber(o.monthlyPayment);
        if (stored === null) continue;
        monthly = stored;
        totalFinanced = stored * months;
      }
    } else {
      const apr = toFiniteNumber(o.annualRatePct);
      if (apr !== null) {
        monthly = amortizedMonthly(principal, apr, months);
        totalFinanced = monthly * months;
      } else {
        const stored = toFiniteNumber(o.monthlyPayment);
        if (stored === null) continue;
        monthly = stored;
        totalFinanced = stored * months;
      }
    }

    const totalPayable = down + totalFinanced;

    offers.push({
      id: o.id,
      financing_type: isIslamic ? "islamic" : "conventional",
      provider,
      provider_badge: providerBadge(provider, o.providerName, isIslamic),
      monthly_display: formatEGP(monthly) ?? "—",
      duration_months: months,
      down_payment_display: o.downPayment != null ? formatEGP(o.downPayment) : null,
      total_payable_display: formatEGP(totalPayable) ?? "—",
      is_best: false,
    });
    metrics.push({ monthly, total: totalPayable });
  }

  if (offers.length === 0) {
    return { offers: [], best_offer: null, best_offer_badge: null };
  }

  // Selection: exclude cash (already filtered). Global rule is lowest monthly,
  // tie-broken by lowest total payable. But when EVERY offer is Islamic, rank by
  // lowest total payable first (Islamic shoppers compare total cost, not rate).
  const allIslamic = offers.every((o) => o.financing_type === "islamic");
  const order = offers.map((_, i) => i).sort((a, b) => {
    if (allIslamic) {
      if (metrics[a].total !== metrics[b].total) return metrics[a].total - metrics[b].total;
      return metrics[a].monthly - metrics[b].monthly;
    }
    if (metrics[a].monthly !== metrics[b].monthly) return metrics[a].monthly - metrics[b].monthly;
    return metrics[a].total - metrics[b].total;
  });

  const bestIdx = order[0];
  offers[bestIdx].is_best = true;
  const best = offers[bestIdx];

  return {
    offers,
    best_offer: best,
    best_offer_badge: `${best.provider_badge} · from ${best.monthly_display}/mo`,
  };
}
