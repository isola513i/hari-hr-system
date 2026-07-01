# 0002 — JWT Bearer auth (header-only, no cookies)

**Status:** Accepted

## Context

The API is a stateless REST service consumed by a SPA (and potentially future mobile
clients). We needed an auth mechanism that works across those clients, scales without
server-side session storage, and has a clear story for token refresh and revocation.

## Decision

Use **JWT access tokens sent in the `Authorization: Bearer <token>` header**, never in
cookies. Complementary pieces:

- Short-lived access token + a rotating **refresh token** (`refresh_tokens` table) that
  can be revoked on logout.
- Optional **TOTP 2FA** (`totp_*` tables) gating login.
- Because tokens are in a header (not a cookie), classic **CSRF does not apply** — the
  browser does not auto-attach the credential to cross-site requests. As defense-in-depth
  we still validate the `Origin` header on state-changing requests
  (`middlewares/csrf.ts`).

## Consequences

- **+** Stateless verification — any API instance validates a token with the signing
  secret; no shared session store.
- **+** Same scheme works for web and non-browser clients.
- **+** No CSRF token plumbing needed (header credential, not ambient cookie).
- **−** Access tokens can't be invalidated before expiry — mitigated by keeping them
  short-lived and revoking the refresh token.
- **−** The SPA must store the token (memory/localStorage) and attach it per request; XSS
  that reads storage is the main threat, so the app also ships a strict CSP (Helmet).
- **Requires** `JWT_SECRET` (and `TOTP_ENCRYPTION_KEY`) to be set — see `.env.example`.
