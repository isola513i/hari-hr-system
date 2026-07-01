# Architecture Decision Records

ADRs capture the **reasoning** behind significant technical decisions — the context,
the choice, and the trade-offs — so future contributors understand *why* the system
is built the way it is (ARCHITECTURE.md covers *what*; these cover *why*).

## Index

| # | Decision | Status |
|---|----------|--------|
| [0001](0001-monorepo-npm-workspaces.md) | Monorepo with npm workspaces | Accepted |
| [0002](0002-jwt-bearer-auth.md) | JWT Bearer auth (header-only, no cookies) | Accepted |
| [0003](0003-layered-db-migrations.md) | Layered, tool-free DB migration strategy | Accepted |
| [0004](0004-react-query-server-state.md) | TanStack React Query for server state | Accepted |
| [0005](0005-pii-encryption-blind-index.md) | AES-256-GCM PII encryption + HMAC blind index | Accepted |
| [0006](0006-system-configs-json-store.md) | `system_configs` JSON store for flexible config | Accepted |

## Format

Each ADR is a short Markdown file: **Context** (the forces at play) → **Decision**
(what we chose) → **Consequences** (the trade-offs, good and bad).

## Adding a new ADR

1. Copy the structure of an existing ADR into `docs/adr/NNNN-short-title.md` (next number).
2. Set **Status** to `Proposed`, then `Accepted`/`Rejected` once decided.
3. Never rewrite history — supersede an old ADR with a new one and link between them.
4. Add a row to the index above.
