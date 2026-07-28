import { Router } from "express";
import {
  searchHandler,
  mapClustersHandler,
  autocompleteHandler,
  facetsHandler,
  trendingHandler,
  recommendationsHandler,
} from "../../controllers/searchController";
import { optionalAuth } from "../../middlewares/authGuard";
import { searchRateLimiter, publicRateLimiter } from "../../middlewares/rateLimiter";

const router = Router();

router.get("/", searchRateLimiter, optionalAuth, searchHandler);
router.get("/map", searchRateLimiter, mapClustersHandler);
router.get("/autocomplete", publicRateLimiter, autocompleteHandler);
router.get("/facets", publicRateLimiter, facetsHandler);
router.get("/trending", publicRateLimiter, trendingHandler);
router.get("/recommendations", publicRateLimiter, optionalAuth, recommendationsHandler);

export default router;
