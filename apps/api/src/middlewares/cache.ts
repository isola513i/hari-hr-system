import { Request, Response, NextFunction } from 'express';

interface CacheEntry {
  data: unknown;
  timestamp: number;
  etag: string;
}

class MemoryCache {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly defaultTTL: number;

  constructor(defaultTTL: number = 60000) {
    this.defaultTTL = defaultTTL;
  }

  get(key: string): CacheEntry | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() - entry.timestamp > this.defaultTTL) {
      this.cache.delete(key);
      return undefined;
    }

    return entry;
  }

  set(key: string, data: unknown): string {
    const etag = `"${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}"`;
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      etag,
    });
    return etag;
  }

  invalidate(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

export const apiCache = new MemoryCache(30000); // 30 second TTL

export const cacheMiddleware = (ttlOverride?: number) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.method !== 'GET') {
      return next();
    }

    const cacheKey = `${req.originalUrl || req.url}`;
    const cached = apiCache.get(cacheKey);

    if (cached) {
      const clientEtag = req.headers['if-none-match'];
      if (clientEtag === cached.etag) {
        res.status(304).end();
        return;
      }

      res.setHeader('X-Cache', 'HIT');
      res.setHeader('ETag', cached.etag);
      res.setHeader('Cache-Control', `private, max-age=${Math.floor((ttlOverride || 30000) / 1000)}`);
      res.json(cached.data);
      return;
    }

    const originalJson = res.json.bind(res);
    res.json = (data: unknown): Response => {
      const etag = apiCache.set(cacheKey, data);
      res.setHeader('X-Cache', 'MISS');
      res.setHeader('ETag', etag);
      res.setHeader('Cache-Control', `private, max-age=${Math.floor((ttlOverride || 30000) / 1000)}`);
      return originalJson(data);
    };

    next();
  };
};

export const invalidateCache = (pattern: string) => {
  return (_req: Request, res: Response, next: NextFunction): void => {
    const originalJson = res.json.bind(res);
    res.json = (data: unknown): Response => {
      apiCache.invalidate(pattern);
      return originalJson(data);
    };
    next();
  };
};
