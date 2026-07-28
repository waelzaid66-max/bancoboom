import app from "./app";
import { logger } from "./lib/logger";
import { ensureDbExtensions, ensureSeedData } from "./lib/bootstrap";
import { reportErrorAsync } from "./lib/errorReporter";
import { startScheduledJobs, runStartupBackfills } from "./jobs";

// Last-resort observability: capture async failures that escape every handler so
// they're logged + alerted instead of vanishing. An unhandled rejection is kept
// NON-fatal (one stray promise shouldn't kill the whole server); an uncaught
// exception leaves the process in an undefined state, so we report then exit and
// let the orchestrator restart cleanly.
process.on("unhandledRejection", (reason) => {
  reportErrorAsync(reason, { kind: "unhandledRejection" });
});
process.on("uncaughtException", (err) => {
  reportErrorAsync(err, { kind: "uncaughtException" });
  setTimeout(() => process.exit(1), 250);
});

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Bind the port FIRST — liveness must never depend on DB reachability or latency.
// Ensuring extensions before listen could delay (or, historically, abort) the
// port opening when the DB is briefly unready at boot, failing the deploy
// healthcheck ("port never opened"). We listen immediately, then ensure
// extensions in the background (non-fatal + self-logged); trigram features
// degrade gracefully until the DB/extension is available. Readiness (DB up) is
// reported separately by /readyz.
app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  void ensureDbExtensions();
  void ensureSeedData();
  startScheduledJobs();
  void runStartupBackfills();
});
