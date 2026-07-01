# 0001 — Monorepo with npm workspaces

**Status:** Accepted

## Context

The product is a single application with a TypeScript React frontend (`apps/web`) and a
TypeScript Node/Express backend (`apps/api`) that share domain concepts (employee, leave,
payroll shapes). We needed a repo layout that keeps the two in lockstep during rapid
iteration by a small team, without the overhead of a multi-repo release dance or a heavy
monorepo tool (Nx/Turborepo/Lerna).

## Decision

Use a single Git repository with **native npm workspaces**:

```
apps/web    — React + Vite frontend
apps/api    — Express + TypeScript backend
packages/shared-types — @hari/shared-types, cross-app TypeScript interfaces
```

The root `package.json` declares the workspaces; dependencies are hoisted to a single root
`node_modules`. Shared TypeScript interfaces live in `packages/shared-types` and are
imported by both apps.

## Consequences

- **+** One `npm install`; one PR can change API + web + shared types atomically.
- **+** No extra build tooling to learn — plain npm scripts (`npm run dev` runs both).
- **+** Shared types prevent frontend/backend drift on core shapes.
- **−** No per-package caching/affected-graph (acceptable at this size; could add
  Turborepo later if build times grow).
- **−** Hoisting can mask a missing dependency in one workspace; mitigated by CI installing
  from a clean lockfile (`npm ci`).
