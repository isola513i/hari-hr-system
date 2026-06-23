# syntax=docker/dockerfile:1
# Build context MUST be the repo root (monorepo workspaces + @hari/shared-types).
#   docker build -f apps/web/Dockerfile -t hari-web .

# ---- Builder ----------------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /repo

# VITE_API_URL is inlined at build time. Default '/api' = same-origin (the nginx
# layer below proxies /api → the api service).
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}

COPY package.json package-lock.json ./
COPY packages/shared-types/package.json packages/shared-types/
COPY apps/web/package.json apps/web/
RUN npm ci --include-workspace-root \
    --workspace=@hari/shared-types --workspace=apps/web

COPY packages/shared-types packages/shared-types
COPY apps/web apps/web
RUN npm run build --workspace=packages/shared-types \
 && npm run build --workspace=apps/web

# ---- Runner (static nginx) --------------------------------------------------
FROM nginx:alpine AS runner
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /repo/apps/web/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
