import NodeCache from 'node-cache';

// Shared in-memory cache; TTLs are set per-call via the `ttl` parameter.
// checkperiod: purge expired entries every 60 seconds to avoid memory leaks.
export const cache = new NodeCache({ checkperiod: 60 });

/**
 * Get a cached value or compute it. Returns the cached value if present,
 * otherwise calls `fn`, caches the result for `ttlSeconds`, and returns it.
 */
export async function getOrSet<T>(
  key: string,
  fn: () => Promise<T>,
  ttlSeconds: number,
): Promise<T> {
  const cached = cache.get<T>(key);
  if (cached !== undefined) return cached;
  const value = await fn();
  cache.set(key, value, ttlSeconds);
  return value;
}

export function invalidate(key: string): void {
  cache.del(key);
}

export function invalidatePattern(prefix: string): void {
  const keys = cache.keys().filter((k) => k.startsWith(prefix));
  cache.del(keys);
}
