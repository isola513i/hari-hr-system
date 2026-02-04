"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invalidateCache = exports.cacheMiddleware = exports.apiCache = void 0;
class MemoryCache {
    constructor(defaultTTL = 60000) {
        this.cache = new Map();
        this.defaultTTL = defaultTTL;
    }
    get(key) {
        const entry = this.cache.get(key);
        if (!entry)
            return undefined;
        if (Date.now() - entry.timestamp > this.defaultTTL) {
            this.cache.delete(key);
            return undefined;
        }
        return entry;
    }
    set(key, data) {
        const etag = `"${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}"`;
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            etag,
        });
        return etag;
    }
    invalidate(pattern) {
        for (const key of this.cache.keys()) {
            if (key.includes(pattern)) {
                this.cache.delete(key);
            }
        }
    }
    clear() {
        this.cache.clear();
    }
}
exports.apiCache = new MemoryCache(30000); // 30 second TTL
const cacheMiddleware = (ttlOverride) => {
    return (req, res, next) => {
        if (req.method !== 'GET') {
            return next();
        }
        const cacheKey = `${req.originalUrl || req.url}`;
        const cached = exports.apiCache.get(cacheKey);
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
        res.json = (data) => {
            const etag = exports.apiCache.set(cacheKey, data);
            res.setHeader('X-Cache', 'MISS');
            res.setHeader('ETag', etag);
            res.setHeader('Cache-Control', `private, max-age=${Math.floor((ttlOverride || 30000) / 1000)}`);
            return originalJson(data);
        };
        next();
    };
};
exports.cacheMiddleware = cacheMiddleware;
const invalidateCache = (pattern) => {
    return (_req, res, next) => {
        const originalJson = res.json.bind(res);
        res.json = (data) => {
            exports.apiCache.invalidate(pattern);
            return originalJson(data);
        };
        next();
    };
};
exports.invalidateCache = invalidateCache;
