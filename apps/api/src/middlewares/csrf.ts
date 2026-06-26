import { Request, Response, NextFunction } from 'express';

// The API uses stateless JWT Bearer-token auth (Authorization header only —
// no session cookies). Browser-triggered cross-site requests cannot forge the
// Authorization header, so classic CSRF token schemes are not required.
//
// This middleware adds defence-in-depth: for state-changing requests that
// include an Origin header, we verify the origin is on the allowlist. Requests
// from server-to-server callers (Postman, curl, CI) omit Origin and are passed
// through unchanged.

const rawAllowed = process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:3000';
const ALLOWED_ORIGINS = rawAllowed.split(',').map((o) => o.trim());

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function validateOrigin(req: Request, res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  const origin = req.headers.origin;
  if (!origin) {
    // No Origin header — server-to-server call; allow through.
    next();
    return;
  }

  const allowed = ALLOWED_ORIGINS.some((o) => origin === o || origin.startsWith(o));
  if (allowed) {
    next();
    return;
  }

  res.status(403).json({ error: 'Forbidden', message: 'Cross-origin request not allowed' });
}
