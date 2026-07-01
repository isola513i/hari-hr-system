# 0006 — `system_configs` JSON store for flexible configuration

**Status:** Accepted

## Context

Several pieces of business configuration change independently of code and benefit from
being editable without a schema migration or redeploy: leave quotas by type, Thai tax
brackets, allowed upload types, review templates, default passwords, OT multipliers. Giving
each its own table/columns would mean a migration every time a new config shape appears.

## Decision

A single generic key-value table, `system_configs(category, key, value, data_type,
description)` with a unique `(category, key)`. `value` is stored as text and parsed
according to `data_type` (`string | number | boolean | json`). Structured config (arrays of
objects) is stored as `data_type = 'json'`.

`SystemConfigService` provides typed getters that read a config with a hardcoded default
fallback — e.g. `getLeaveQuotas()`, `getReviewTemplates()` — so a missing row degrades
gracefully to sensible defaults.

## Consequences

- **+** New config categories need **no migration** — just a new `(category, key)` row and a
  typed getter.
- **+** Config is queryable/editable at runtime (admin UI, seeds) and defaults are baked in.
- **+** One consistent access pattern for all tunables.
- **−** No column-level DB typing/constraints on `value` — validation lives in the service
  layer, so a malformed JSON value only fails at parse time (guarded: parse errors log and
  fall back to the default).
- **−** Not suitable for high-write or relational config; this is for low-churn settings
  read often and written rarely.
