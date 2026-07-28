import { pool } from "@workspace/db";

/**
 * Runs `fn` while holding a Postgres session-level advisory lock identified by
 * `key`. If another instance already holds the lock the function is skipped and
 * `false` is returned. This makes scheduled jobs safe to register on multiple
 * instances: only the instance that wins the lock performs the work.
 *
 * The lock is acquired and released on the *same* pooled connection, which is
 * required for advisory locks to behave correctly.
 */
export async function withAdvisoryLock(
  key: number,
  fn: () => Promise<void>,
): Promise<boolean> {
  const client = await pool.connect();
  try {
    const res = await client.query<{ locked: boolean }>(
      "SELECT pg_try_advisory_lock($1) AS locked",
      [key],
    );
    if (!res.rows[0]?.locked) {
      return false;
    }
    try {
      await fn();
    } finally {
      await client.query("SELECT pg_advisory_unlock($1)", [key]);
    }
    return true;
  } finally {
    client.release();
  }
}
