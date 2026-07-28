import pino, { type Logger, type TransportTargetOptions } from "pino";
import path from "node:path";

const isProduction = process.env.NODE_ENV === "production";
const isVercel = process.env.VERCEL === "1";

/**
 * In tests (vitest) every logger collapses to a silent, transport-less pino
 * instance. The rotated-file/pretty transports spawn worker threads and open
 * log files on import — those leak open handles and slow test teardown, and the
 * abuse/quality services under test import this module transitively. Detected
 * via VITEST (set by vitest) or NODE_ENV=test.
 */
const isTest = !!process.env.VITEST || process.env.NODE_ENV === "test";

/**
 * Directory where durable, rotated log files are written. Override with LOG_DIR.
 * Each channel (errors, access/audit, lead-events) gets its own daily-rotated
 * file so operators can tail or ship them independently.
 * On Vercel, the filesystem is read-only except `/tmp`, so default there is
 * `/tmp/banco-logs` to keep file transports writable.
 */
const LOG_DIR =
  process.env.LOG_DIR ??
  (isVercel ? "/tmp/banco-logs" : path.resolve(process.cwd(), "logs"));

const REDACT_PATHS = [
  "req.headers.authorization",
  "req.headers.cookie",
  "res.headers['set-cookie']",
];

/**
 * A `pino-roll` transport target that rotates the given log file daily and
 * retains a bounded number of historical files. `mkdir` ensures LOG_DIR exists.
 */
function rollTarget(file: string, level: string): TransportTargetOptions {
  return {
    target: "pino-roll",
    level,
    options: {
      file: path.join(LOG_DIR, file),
      frequency: "daily",
      mkdir: true,
      dateFormat: "yyyy-MM-dd",
      extension: ".log",
      limit: { count: 30 },
    },
  };
}

/**
 * Main application logger.
 * - Development: pretty, colorized console output.
 * - Production: structured JSON on stdout.
 * - Always: critical errors mirrored to a durable, daily-rotated error file.
 *
 * The transport list is structured so an external error reporter (e.g. Sentry)
 * can be slotted in as an additional target without touching call sites.
 */
const mainTargets: TransportTargetOptions[] = [
  isProduction
    ? { target: "pino/file", level: "info", options: { destination: 1 } }
    : { target: "pino-pretty", level: "debug", options: { colorize: true } },
  rollTarget("error", "error"),
];

export const logger: Logger = isTest
  ? pino({ level: "silent" })
  : pino({
      level: process.env.LOG_LEVEL ?? "info",
      redact: REDACT_PATHS,
      transport: { targets: mainTargets },
    });

/**
 * Builds a dedicated channel logger that writes to its own rotated file. In
 * development it also mirrors to the console so the channel is observable while
 * working locally.
 */
function makeChannelLogger(file: string, channel: string): Logger {
  if (isTest) return pino({ level: "silent", base: { channel } });
  const targets: TransportTargetOptions[] = [rollTarget(file, "info")];
  if (!isProduction) {
    targets.push({
      target: "pino-pretty",
      level: "info",
      options: { colorize: true, messageFormat: `[${channel}] {msg}` },
    });
  }
  return pino({
    level: process.env.LOG_LEVEL ?? "info",
    redact: REDACT_PATHS,
    base: { channel },
    transport: { targets },
  });
}

/**
 * Access / audit trail: one structured entry per HTTP request. Kept separate
 * from application errors so the request history can be retained and analyzed
 * independently.
 */
export const accessLogger: Logger = makeChannelLogger("access", "access");

/**
 * Lead business-event log: durable record of every captured lead (whatsapp,
 * call, chat, finance request). This is the money path — it must never be lost
 * in the noise of general application logs.
 */
export const leadLogger: Logger = makeChannelLogger("lead", "lead");

/**
 * Abuse / revenue-protection audit channel: a durable mirror of every event
 * also written to the `audit_log` table (blocked leads, invalid impressions,
 * flagged listings, rate-limit hits, shadow bans). Kept as its own rotated
 * file so the abuse trail survives even if a DB write fails.
 */
export const auditLogger: Logger = makeChannelLogger("audit", "audit");
