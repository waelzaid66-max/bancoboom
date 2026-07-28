/**
 * In-memory request metrics collector for the Admin Control Center's live
 * monitoring surface. Bounded and per-instance: it summarizes recent request
 * throughput, error rate and latency without any external dependency.
 *
 * It fronts (does not replace) the durable access-log channel — it exists so
 * the admin /monitoring endpoint can render real, current numbers cheaply.
 */

const SERVER_STARTED_AT = Date.now();

/** Cap distinct endpoint buckets so a path-explosion attack can't grow memory. */
const MAX_ENDPOINTS = 200;
/** Rolling window of recent samples used for throughput. */
const THROUGHPUT_WINDOW_MS = 60_000;
const MAX_RECENT_SAMPLES = 5_000;

interface EndpointBucket {
  count: number;
  errorCount: number;
  /** Bounded reservoir of recent latencies (ms) for percentile estimation. */
  latencies: number[];
}

const MAX_LATENCIES_PER_BUCKET = 500;

const endpoints = new Map<string, EndpointBucket>();
let totalRequests = 0;
let totalErrors = 0;

/** Timestamps (ms) of recent requests, for per-minute throughput. */
const recentTimestamps: number[] = [];

/** Normalize a path so dynamic ids collapse into a single bucket. */
function normalizePath(method: string, path: string): string {
  const collapsed = path
    .replace(/\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g, "/:id")
    .replace(/\/\d+/g, "/:id");
  return `${method} ${collapsed}`;
}

export function recordRequest(method: string, path: string, statusCode: number, durationMs: number): void {
  const now = Date.now();
  totalRequests += 1;
  if (statusCode >= 500) totalErrors += 1;

  recentTimestamps.push(now);
  if (recentTimestamps.length > MAX_RECENT_SAMPLES) recentTimestamps.shift();

  const key = normalizePath(method, path);
  let bucket = endpoints.get(key);
  if (!bucket) {
    if (endpoints.size >= MAX_ENDPOINTS) {
      // Drop the least-used bucket to stay bounded.
      let minKey: string | undefined;
      let minCount = Infinity;
      for (const [k, b] of endpoints) {
        if (b.count < minCount) {
          minCount = b.count;
          minKey = k;
        }
      }
      if (minKey) endpoints.delete(minKey);
    }
    bucket = { count: 0, errorCount: 0, latencies: [] };
    endpoints.set(key, bucket);
  }
  bucket.count += 1;
  if (statusCode >= 500) bucket.errorCount += 1;
  bucket.latencies.push(durationMs);
  if (bucket.latencies.length > MAX_LATENCIES_PER_BUCKET) bucket.latencies.shift();
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return Math.round(sorted[idx]!);
}

function recentThroughputPerMin(): number {
  const cutoff = Date.now() - THROUGHPUT_WINDOW_MS;
  let count = 0;
  for (let i = recentTimestamps.length - 1; i >= 0; i--) {
    if (recentTimestamps[i]! >= cutoff) count += 1;
    else break;
  }
  return count;
}

export interface MetricsSnapshot {
  uptime_seconds: number;
  total_requests: number;
  throughput_per_min: number;
  error_rate: number;
  latency_p50_ms: number;
  latency_p95_ms: number;
  feed_latency_p50_ms: number;
  feed_latency_p95_ms: number;
  endpoints: {
    path: string;
    count: number;
    error_count: number;
    p50_ms: number;
    p95_ms: number;
  }[];
}

export function getMetricsSnapshot(): MetricsSnapshot {
  const allLatencies: number[] = [];
  const feedLatencies: number[] = [];
  const endpointRows = [] as MetricsSnapshot["endpoints"];

  for (const [key, bucket] of endpoints) {
    for (const l of bucket.latencies) allLatencies.push(l);
    if (key.includes("/feed")) {
      for (const l of bucket.latencies) feedLatencies.push(l);
    }
    endpointRows.push({
      path: key,
      count: bucket.count,
      error_count: bucket.errorCount,
      p50_ms: percentile(bucket.latencies, 50),
      p95_ms: percentile(bucket.latencies, 95),
    });
  }

  endpointRows.sort((a, b) => b.count - a.count);

  return {
    uptime_seconds: Math.round((Date.now() - SERVER_STARTED_AT) / 1000),
    total_requests: totalRequests,
    throughput_per_min: recentThroughputPerMin(),
    error_rate: totalRequests > 0 ? Number((totalErrors / totalRequests).toFixed(4)) : 0,
    latency_p50_ms: percentile(allLatencies, 50),
    latency_p95_ms: percentile(allLatencies, 95),
    feed_latency_p50_ms: percentile(feedLatencies, 50),
    feed_latency_p95_ms: percentile(feedLatencies, 95),
    endpoints: endpointRows.slice(0, 20),
  };
}

/** Current global error rate (0..1) over all requests. Used by the overview KPI. */
export function getGlobalErrorRate(): number {
  return totalRequests > 0 ? Number((totalErrors / totalRequests).toFixed(4)) : 0;
}
