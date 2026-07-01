# 0004 — TanStack React Query for server state

**Status:** Accepted

## Context

The frontend is data-heavy: dozens of list/detail views backed by REST endpoints, with
real-time updates over Socket.io. An earlier iteration hand-rolled a custom cache and
threaded server data through React Context, which led to duplicated fetching, manual
invalidation bugs, and stale views.

## Decision

Adopt **TanStack React Query v5** as the single source of truth for **server state**:

- All API reads go through query hooks (`hooks/queries/*`) keyed by a central `queryKeys`
  factory; mutations invalidate the relevant keys.
- Socket.io events bridge into the cache via `useSocketQuerySync`, so a real-time event
  invalidates/updates the same cache the queries read.
- React Context is reserved for **client/UI state** only (auth session, theme,
  notifications) — not for caching server data.

## Consequences

- **+** Caching, background refetch, dedup, and stale-while-revalidate come for free.
- **+** One invalidation model (`queryKeys`) instead of ad-hoc cache pokes; real-time and
  request-driven updates converge on the same cache.
- **+** Less boilerplate than Redux for async server data.
- **−** Two state systems to reason about (React Query for server, Context for UI) — the
  boundary must be kept disciplined (don't stuff server data into Context).
- **−** Query-key hygiene matters: a wrong/duplicated key silently breaks invalidation, so
  keys are centralised in `lib/queryKeys.ts`.
