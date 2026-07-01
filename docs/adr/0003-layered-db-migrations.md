# 0003 — Layered, tool-free database migration strategy

**Status:** Accepted

## Context

The schema evolved rapidly (40+ tables) with a small team and frequent deploys to a
managed Postgres (Neon). A full migration framework (Prisma Migrate, TypeORM, Knex
migrations) adds a dependency, a migration-state table, and a workflow overhead that felt
heavy for the team's velocity — but we still needed existing databases to pick up schema
changes safely on deploy.

## Decision

A three-layer, framework-free strategy (documented in `docs/DATABASE.md`):

1. **`init-db.ts`** — the canonical DDL. Drops and recreates all tables. Run once on a
   fresh database.
2. **`runLightMigrations()`** — runs on **every server startup**, using idempotent
   `ADD COLUMN IF NOT EXISTS` / `CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS`.
   This is the primary path for incremental schema changes reaching live databases: a new
   column self-applies on the next deploy with no manual step.
3. **Standalone scripts** (`scripts/migrate-*.ts`) — one-off data backfills/transforms, run
   manually and wired as `npm run db:migrate:*`.

## Consequences

- **+** Zero new dependencies or migration-state bookkeeping.
- **+** Schema changes ship with the code that needs them and apply on deploy automatically.
- **+** Idempotency makes re-runs and partial failures safe.
- **−** No automatic **down** migrations / rollback — forward-only. Destructive changes must
  be hand-written carefully.
- **−** No single ordered history of changes; the "current schema" is the union of
  `init-db.ts` + `runLightMigrations()`. Mitigated by folding every change into both so a
  fresh init matches a long-lived database.
- **−** Startup does a little schema work each boot (cheap; all `IF NOT EXISTS`).

If the team grows or the schema stabilises, revisit adopting a real migration tool
(supersede this ADR).
