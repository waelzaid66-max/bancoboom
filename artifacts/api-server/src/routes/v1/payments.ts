import { Router } from "express";
import {
  paymobWebhookHandler,
  paymentReturnHandler,
} from "../../controllers/paymentsController";

const router = Router();

// PSP webhook — NO auth: it is server-to-server and authenticated by HMAC
// signature inside the handler. This is the only path that settles payments.
router.post("/webhook", paymobWebhookHandler);

// Post-checkout redirect landing page (public, informational only).
router.get("/return", paymentReturnHandler);

export default router;
