import type { Request, Response } from "express";
import { verifyPaymobWebhook } from "../lib/paymentProvider";
import {
  getIntentMeta,
  settleTopupIntent,
  markTopupIntentFailed,
} from "../services/PaymentIntentService";
import {
  settleSubscriptionIntentByWebhook,
  markSubscriptionIntentFailed,
} from "../services/SubscriptionService";

/**
 * Paymob "transaction processed" webhook — the ONLY path that settles a
 * payment. The HMAC signature is verified before any field is trusted; an
 * invalid signature is rejected with 401 and never touches the ledger.
 *
 * Valid-but-unactionable deliveries (unknown intent, amount mismatch, already
 * settled) are acknowledged with 200 so the provider stops retrying. Genuine
 * processing failures return 500 so the provider retries later.
 */
export async function paymobWebhookHandler(req: Request, res: Response) {
  const body = (req.body ?? {}) as { obj?: Record<string, unknown> };
  const obj = body.obj ?? {};
  const providedHmac =
    typeof req.query.hmac === "string" ? req.query.hmac : undefined;

  const verification = await verifyPaymobWebhook({ obj, providedHmac });
  if (!verification.valid) {
    return res.status(401).json({ ok: false });
  }
  if (!verification.intentId) {
    console.warn("[Paymob webhook] signed but no intent id present");
    return res.status(200).json({ ok: true });
  }

  try {
    const meta = await getIntentMeta(verification.intentId);
    if (!meta) {
      // Unknown intent — ack to stop retries.
      return res.status(200).json({ ok: true });
    }

    // Tamper / mismatch guard: the signed amount must equal the intent amount.
    if (
      verification.amountCents != null &&
      Math.round(Number(meta.amount) * 100) !== verification.amountCents
    ) {
      console.error(
        "[Paymob webhook] amount mismatch for intent",
        verification.intentId
      );
      return res.status(200).json({ ok: true });
    }

    if (verification.success) {
      if (meta.purpose === "subscription") {
        await settleSubscriptionIntentByWebhook(verification.intentId, {
          providerTxnId: verification.providerTxnId,
        });
      } else {
        await settleTopupIntent(verification.intentId, {
          providerTxnId: verification.providerTxnId,
        });
      }
    } else {
      if (meta.purpose === "subscription") {
        await markSubscriptionIntentFailed(verification.intentId);
      } else {
        await markTopupIntentFailed(verification.intentId);
      }
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[Paymob webhook] settlement error", err);
    return res.status(500).json({ ok: false });
  }
}

/**
 * Post-checkout redirect landing. Paymob sends the buyer here after the hosted
 * checkout. Settlement is already handled by the webhook, so this is a tiny
 * "you can return to the app" page; the client polls intent status separately.
 */
export function paymentReturnHandler(_req: Request, res: Response) {
  res
    .status(200)
    .type("html")
    .send(
      `<!doctype html><html lang="en"><head><meta charset="utf-8" />` +
        `<meta name="viewport" content="width=device-width, initial-scale=1" />` +
        `<title>BANCO Payment</title>` +
        `<style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;` +
        `display:flex;min-height:100vh;align-items:center;justify-content:center;` +
        `margin:0;background:#0b0b0c;color:#fafafa;text-align:center;padding:24px}` +
        `.c{max-width:340px}h1{font-size:20px;margin:0 0 8px}p{opacity:.7;line-height:1.5}` +
        `</style></head><body><div class="c"><h1>Payment received</h1>` +
        `<p>You can close this window and return to the BANCO app. ` +
        `Your balance will update automatically.</p></div></body></html>`
    );
}
