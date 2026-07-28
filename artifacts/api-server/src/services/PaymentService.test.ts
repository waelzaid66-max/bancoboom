import { describe, it, expect } from "vitest";
import { normalizePaymentOptions, computeOffers } from "./PaymentService";
import type { PaymentOption } from "@workspace/db";

function opt(p: Partial<PaymentOption> = {}): PaymentOption {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    listingId: "00000000-0000-0000-0000-000000000002",
    mode: "seller_installment",
    downPayment: null,
    monthlyPayment: null,
    durationMonths: null,
    isIslamicCompliant: false,
    provider: "seller",
    providerName: null,
    annualRatePct: null,
    profitRatePct: null,
    ...p,
  };
}

describe("normalizePaymentOptions", () => {
  it("reports no installment when every option is cash", () => {
    const r = normalizePaymentOptions([opt({ mode: "cash" })]);
    expect(r.has_installment).toBe(false);
    expect(r.lowest_monthly).toBeNull();
    expect(r.lowest_down_payment).toBeNull();
    expect(r.badge).toBeNull();
    expect(r.options[0].mode).toBe("cash");
  });

  it("surfaces the lowest monthly + a starts-from badge", () => {
    const r = normalizePaymentOptions([
      opt({ monthlyPayment: "5000", durationMonths: 12 }),
    ]);
    expect(r.has_installment).toBe(true);
    expect(r.lowest_monthly).toBe("5K EGP");
    expect(r.badge).toBe("Starts from 5K EGP/month");
  });

  it("picks the lowest monthly and lowest down payment across options", () => {
    const r = normalizePaymentOptions([
      opt({ monthlyPayment: "8000", downPayment: "100000" }),
      opt({ monthlyPayment: "5000", downPayment: "50000" }),
    ]);
    expect(r.lowest_monthly).toBe("5K EGP");
    expect(r.lowest_down_payment).toBe("50K EGP");
  });

  it("never treats a cash row as an installment, even if it carries a monthly", () => {
    const r = normalizePaymentOptions([
      opt({ mode: "cash", monthlyPayment: "3000" }),
      opt({ mode: "seller_installment", monthlyPayment: "5000" }),
    ]);
    expect(r.has_installment).toBe(true);
    expect(r.lowest_monthly).toBe("5K EGP");
  });
});

describe("computeOffers", () => {
  it("amortizes a conventional offer and pre-formats all money", () => {
    const { offers, best_offer, best_offer_badge } = computeOffers(
      [opt({ durationMonths: 12, annualRatePct: "0", provider: "seller" })],
      100000,
    );
    expect(offers).toHaveLength(1);
    const o = offers[0];
    expect(o.financing_type).toBe("conventional");
    expect(o.monthly_display).toBe("8K EGP"); // 100000 / 12 ≈ 8333 → 8K
    expect(o.is_best).toBe(true);
    expect(best_offer?.id).toBe(o.id);
    expect(best_offer_badge).toBe("Seller Plan · from 8K EGP/mo");
  });

  it("computes an Islamic offer as a fixed total and NEVER emits a rate/APR", () => {
    const { offers } = computeOffers(
      [
        opt({
          mode: "bank_finance",
          isIslamicCompliant: true,
          durationMonths: 10,
          downPayment: "20000",
          profitRatePct: "10",
          provider: "bank",
          providerName: "CIB",
        }),
      ],
      100000,
    );
    const o = offers[0];
    // principal 80000 → total 88000 → monthly 8800; total payable incl. down.
    expect(o.financing_type).toBe("islamic");
    expect(o.monthly_display).toBe("9K EGP"); // 8800 → 9K
    expect(o.down_payment_display).toBe("20K EGP");
    expect(o.total_payable_display).toBe("108K EGP");
    expect(o.provider_badge).toBe("CIB · Islamic");
    expect(o).not.toHaveProperty("rate");
    expect(o).not.toHaveProperty("apr");
    expect(o).not.toHaveProperty("annual_rate_pct");
    expect(o).not.toHaveProperty("profit_rate_pct");
  });

  it("excludes cash options from the offer set", () => {
    const { offers } = computeOffers(
      [
        opt({ mode: "cash" }),
        opt({ mode: "seller_installment", durationMonths: 12, monthlyPayment: "5000" }),
      ],
      100000,
    );
    expect(offers).toHaveLength(1);
  });

  it("returns an empty result when there is nothing to finance", () => {
    const r = computeOffers([opt({ mode: "cash" })], 100000);
    expect(r.offers).toEqual([]);
    expect(r.best_offer).toBeNull();
    expect(r.best_offer_badge).toBeNull();
  });

  it("picks the lowest-monthly offer as best for conventional plans", () => {
    const { offers, best_offer } = computeOffers(
      [
        opt({ id: "A", durationMonths: 12, monthlyPayment: "8000" }),
        opt({ id: "B", durationMonths: 12, monthlyPayment: "5000" }),
      ],
      100000,
    );
    expect(best_offer?.id).toBe("B");
    expect(offers.find((o) => o.id === "B")?.is_best).toBe(true);
    expect(offers.find((o) => o.id === "A")?.is_best).toBe(false);
  });

  it("ranks all-Islamic offers by lowest total payable, not lowest monthly", () => {
    const { best_offer } = computeOffers(
      [
        opt({ id: "C", isIslamicCompliant: true, durationMonths: 12, monthlyPayment: "5000" }), // total 60000
        opt({ id: "D", isIslamicCompliant: true, durationMonths: 6, monthlyPayment: "6000" }), // total 36000
      ],
      100000,
    );
    expect(best_offer?.id).toBe("D");
  });
});
