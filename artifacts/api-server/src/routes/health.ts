import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const DB_CHECK_TIMEOUT_MS = 2000;

/**
 * Root liveness. The platform deploy probe hits `/api` directly, which mounts
 * this router at its root — previously no route matched `/api`, so the probe got
 * a non-200 and the deploy was marked unhealthy. This must NOT touch the database
 * (liveness != readiness); it only proves the process is up and serving.
 */
router.get("/", (_req, res) => {
  res.json({ status: "ok" });
});

/**
 * Liveness: is the process up and able to serve? Intentionally trivial — it must
 * not touch external dependencies, so an unhealthy database does not cause the
 * orchestrator to kill an otherwise-healthy process.
 */
router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

// Alias kept for clarity alongside /readyz.
router.get("/livez", (_req, res) => {
  res.json({ status: "ok" });
});

/**
 * Readiness: should this instance receive traffic? Returns 200 only when the
 * database is actually reachable; otherwise 503 so load balancers stop routing
 * to it. The DB probe is time-boxed so readiness never hangs.
 */
router.get("/readyz", async (_req, res) => {
  const checks: Record<string, "ok" | "down"> = {};
  let healthy = true;

  try {
    await Promise.race([
      db.execute(sql`SELECT 1`),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("db check timed out")), DB_CHECK_TIMEOUT_MS),
      ),
    ]);
    checks.database = "ok";
  } catch (err) {
    checks.database = "down";
    healthy = false;
    logger.error({ err }, "Readiness check failed: database unreachable");
  }

  res.status(healthy ? 200 : 503).json({
    status: healthy ? "ok" : "degraded",
    checks,
  });
});

export default router;
