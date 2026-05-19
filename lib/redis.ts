/**
 * lib/redis.ts
 *
 * Singleton Redis client using ioredis.
 * Shared by both API routes (for rate limiting and config reads) and
 * BullMQ queue definitions.
 *
 * In production, REDIS_URL points to Upstash (TLS).
 * In development, it points to a local Redis instance (no TLS).
 */

import Redis from 'ioredis';

if (!process.env.REDIS_URL) {
  throw new Error('[Redis] REDIS_URL is not set. Check your .env.local file.');
}

// Prevent multiple connections during hot-reload in development
const globalForRedis = globalThis as typeof globalThis & { _redisClient?: Redis };

export const redis: Redis =
  globalForRedis._redisClient ??
  new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    // Upstash requires TLS; local Redis does not
    tls: process.env.REDIS_URL.startsWith('rediss://') ? {} : undefined,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForRedis._redisClient = redis;
}

redis.on('error', (err) => {
  console.error('[Redis] Connection error:', err.message);
});

// ── Typed helpers ─────────────────────────────────────────────────────────────

/**
 * Get a cached value and parse it as JSON.
 * Returns null on cache miss or parse failure.
 */
export async function getJson<T>(key: string): Promise<T | null> {
  const raw = await redis.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Set a JSON-serialisable value with an optional TTL in seconds.
 */
export async function setJson(
  key: string,
  value: unknown,
  ttlSeconds?: number
): Promise<void> {
  const serialised = JSON.stringify(value);
  if (ttlSeconds) {
    await redis.setex(key, ttlSeconds, serialised);
  } else {
    await redis.set(key, serialised);
  }
}

/**
 * Read a config value from the platform_config table, with a 5-minute
 * Redis cache to avoid a DB round-trip on every request.
 *
 * NOTE: This function imports the DB client — keep it here to avoid
 * circular imports between lib/redis.ts and lib/db/client.ts.
 */
export async function getConfig(key: string): Promise<unknown> {
  const cacheKey = `config:${key}`;
  const cached = await redis.get(cacheKey);
  if (cached) {
    try { return JSON.parse(cached); } catch { /* fall through */ }
  }

  const { query } = await import('./db/client');
  const result = await query(
    'SELECT value FROM platform_config WHERE key = $1',
    [key]
  );
  const value = result.rows[0]?.value ?? null;
  if (value !== null) {
    await redis.setex(cacheKey, 300, JSON.stringify(value));
  }
  return value;
}
