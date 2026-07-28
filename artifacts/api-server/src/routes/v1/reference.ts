import { Router } from "express";
import { placeSuggestionsHandler } from "../../controllers/referenceController";
import { publicRateLimiter } from "../../middlewares/rateLimiter";

const router = Router();

// Public, read-only autocomplete over the geo/real-estate reference dataset.
router.get("/places", publicRateLimiter, placeSuggestionsHandler);

export default router;
