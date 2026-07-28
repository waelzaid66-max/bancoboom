import { logger } from "./logger";

export interface CircuitBreakerOptions {
  /** Human-readable name used in logs. */
  name: string;
  /** Per-call latency budget; calls slower than this are treated as failures. */
  timeoutMs: number;
  /** Consecutive failures before the breaker opens. */
  failureThreshold: number;
  /** How long the breaker stays open before allowing a probe call. */
  resetTimeoutMs: number;
}

type State = "closed" | "open" | "half-open";

/**
 * Minimal circuit breaker with a per-call timeout. Wraps a slow/fragile async
 * operation: when it repeatedly fails or exceeds its latency budget the breaker
 * "opens" and short-circuits to a fallback instead of making callers wait.
 * After `resetTimeoutMs` it allows a single probe ("half-open") to test recovery.
 */
export class CircuitBreaker {
  private state: State = "closed";
  private failures = 0;
  private nextAttempt = 0;

  constructor(private readonly opts: CircuitBreakerOptions) {}

  async execute<T>(fn: () => Promise<T>, fallback: () => T | Promise<T>): Promise<T> {
    if (this.state === "open") {
      if (Date.now() < this.nextAttempt) {
        return fallback();
      }
      this.state = "half-open";
    }

    try {
      const result = await this.withTimeout(fn());
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure(err);
      return fallback();
    }
  }

  private withTimeout<T>(promise: Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`${this.opts.name} exceeded ${this.opts.timeoutMs}ms budget`));
      }, this.opts.timeoutMs);
      promise.then(
        (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        (err) => {
          clearTimeout(timer);
          reject(err);
        },
      );
    });
  }

  private onSuccess(): void {
    this.failures = 0;
    if (this.state !== "closed") {
      this.state = "closed";
      logger.info({ breaker: this.opts.name }, "Circuit breaker closed");
    }
  }

  private onFailure(err: unknown): void {
    this.failures += 1;
    if (this.state === "half-open" || this.failures >= this.opts.failureThreshold) {
      if (this.state !== "open") {
        logger.warn(
          { breaker: this.opts.name, failures: this.failures, err: (err as Error)?.message },
          "Circuit breaker opened — serving fallback",
        );
      }
      this.state = "open";
      this.nextAttempt = Date.now() + this.opts.resetTimeoutMs;
    }
  }
}
