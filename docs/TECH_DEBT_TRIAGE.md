# TODO / FIXME Triage

_Last audited: 2026-06-30_

## Summary

The codebase carries **no actionable inline tech-debt markers**. A repo-wide audit of
`TODO`, `FIXME`, `HACK`, and `XXX` comments found **0 matches in first-party source**
(`apps/api/src`, `apps/web` excluding generated output).

## How the audit was run

```bash
grep -rInE "(//|/\*|\*|#)\s*(TODO|FIXME|HACK|XXX)\b" \
  apps/api/src apps/web \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
  | grep -v "/dist/" | grep -v "node_modules"
```

Raw counts before filtering looked alarming (~433 `TODO`, 8 `FIXME`, 24 `HACK`, 16 `XXX`),
but **every one lives in generated or vendored output** and is not ours to act on:

- `apps/web/dist/**` — Vite build artifacts (regenerated; should not be committed/inspected)
- `node_modules/**` — third-party packages
- The two remaining `XXXX` strings are UI placeholders, not debt:
  - `apps/web/pages/Login.tsx` — backup-code input mask `"XXXXX-XXXXX"`
  - `apps/web/.env.example` — GA Measurement-ID placeholder

| Marker | First-party source |
|--------|--------------------|
| TODO   | 0 |
| FIXME  | 0 |
| HACK   | 0 |
| XXX    | 0 (1 placeholder false-positive) |

## Where work is actually tracked

This project does **not** use inline `TODO` comments as a backlog. Outstanding work lives in:

- **AIYA Task** (`task.aiya.me`, space *HARI Internal*) — the live sprint board
- **`docs/HIGH_PRIORITY_IMPROVEMENTS.md`** — prioritized improvement notes
- **`docs/`** — design/architecture records (`ARCHITECTURE.md`, `REFACTORING_SUMMARY.md`, …)

## Recommendation (optional follow-up)

To keep the source free of orphaned debt markers, consider an ESLint rule so any future
`TODO`/`FIXME` is at least visible in lint output:

```jsonc
// .eslintrc — warn (don't fail) so it surfaces without blocking
"no-warning-comments": ["warn", { "terms": ["todo", "fixme", "hack"], "location": "anywhere" }]
```

Pair it with ensuring `apps/web/dist/` is git-ignored so build artifacts never pollute audits.
