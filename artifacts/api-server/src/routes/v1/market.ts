import { Router } from "express";
import { getMarketTrendsHandler } from "../../controllers/marketController";
import { publicRateLimiter } from "../../middlewares/rateLimiter";

const router = Router();

router.get("/trends", publicRateLimiter, getMarketTrendsHandler);

export default router;
