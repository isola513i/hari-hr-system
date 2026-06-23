# syntax=docker/dockerfile:1
# Build context MUST be the repo root (monorepo workspaces + @hari/shared-types).
#   docker build -f apps/api/Dockerfile -t hari-api .

# ---- Builder ----------------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /repo

# Install deps using only the manifests first (better layer caching).
COPY package.json package-lock.json ./
COPY packages/shared-types/package.json packages/shared-types/
COPY apps/api/package.json apps/api/
RUN npm ci --include-workspace-root \
    --workspace=@hari/shared-types --workspace=apps/api

# Build the shared types package, then the API.
COPY packages/shared-types packages/shared-types
COPY apps/api apps/api
RUN npm run build --workspace=packages/shared-types \
 && npm run build --workspace=apps/api

# ---- Runner -----------------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /repo
ENV NODE_ENV=production

# Production deps only (skip lifecycle scripts — dist is copied in from builder).
COPY package.json package-lock.json ./
COPY packages/shared-types/package.json packages/shared-types/
COPY apps/api/package.json apps/api/
RUN npm ci --omit=dev --ignore-scripts --include-workspace-root \
    --workspace=@hari/shared-types --workspace=apps/api

# Compiled output
COPY --from=builder /repo/packages/shared-types/dist packages/shared-types/dist
COPY --from=builder /repo/apps/api/dist apps/api/dist

WORKDIR /repo/apps/api
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "dist/index.js"]
