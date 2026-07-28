import { NextResponse } from "next/server";
import { buildWebHealthPayload } from "../../../lib/web-health";

/**
 * Liveness for CDN/container probes.
 * Stays HTTP 200 even when the plug is OFF so ops can distinguish
 * "process up + site unplugged" from "process down".
 *
 * Alias: `/api/healthz` (same payload) for uptime monitors that expect healthz.
 */
export function GET() {
  return NextResponse.json(buildWebHealthPayload());
}
