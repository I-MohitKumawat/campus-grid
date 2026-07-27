/**
 * lib/db/client.ts
 *
 * Singleton PostgreSQL connection pool using the `pg` library.
 * Uses @neondatabase/serverless when DATABASE_URL points to Neon,
 * otherwise falls back to `pg` for local Postgres.
 *
 * All query functions in the codebase import `db` from this module.
 * Never instantiate a new Pool elsewhere — always use this singleton.
 */

import { Pool, PoolClient, QueryResultRow } from 'pg';

if (!process.env.DATABASE_URL) {
  throw new Error('[DB] DATABASE_URL is not set. Check your .env.local file.');
}

// Re-use the pool across hot-reloads in development (Next.js module caching)
const globalForDb = globalThis as typeof globalThis & { _pgPool?: Pool };

export const db: Pool =
  globalForDb._pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    // Neon serverless connections are kept alive via the HTTP proxy;
    // for local pg, a small pool is sufficient.
    max: process.env.NODE_ENV === 'production' ? 10 : 3,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    ssl:
      process.env.DATABASE_URL.includes('neon.tech') ||
      process.env.DATABASE_URL.includes('render.com') ||
      process.env.DATABASE_URL.includes('oregon-postgres') ||
      process.env.DATABASE_URL.includes('sslmode=require')
        ? { rejectUnauthorized: false }
        : false,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForDb._pgPool = db;
}

// ── Typed query helper ────────────────────────────────────────────────────────

/**
 * Execute a parameterised SQL query.
 * Returns the full QueryResult so callers can access .rows, .rowCount, etc.
 */
export async function query<T extends QueryResultRow = any>(
  text: string,
  values?: unknown[]
) {
  const start = Date.now();
  const result = await db.query<T>(text, values);
  if (process.env.NODE_ENV === 'development') {
    console.debug(`[DB] query (${Date.now() - start}ms)`, text.slice(0, 80));
  }
  return result;
}

/**
 * Run multiple queries inside a single serialisable transaction.
 * Rolls back automatically on any thrown error.
 */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
