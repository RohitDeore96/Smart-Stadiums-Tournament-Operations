# ==============================================================
# StadiumOps AI — Backend Dockerfile (Cloud Run)
# --------------------------------------------------------------
# Design goals:
#   1. Tiny final image (~120 MB) via Google's distroless static base.
#   2. Fast cold start: deps installed once, only compiled JS copied in.
#   3. Zero root: runs as `nonroot` uid 65534.
#   4. Reproducible: pinned Node 20 LTS Alpine for build, distroless for run.
# ==============================================================

# ---------- Stage 1: build ----------
FROM node:20-alpine AS builder

WORKDIR /app

# Enable pnpm via corepack (no separate install needed)
ENV CI=1
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

# Copy workspace manifests first for layer caching.
# Only copy package.json files; source comes after deps are installed.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/api/package.json ./apps/api/package.json
COPY packages/shared/package.json ./packages/shared/package.json

# Install with --frozen-lockfile in CI; fallback for first-time builds.
RUN pnpm install --frozen-lockfile || pnpm install

# Copy the rest of the source
COPY apps/api ./apps/api
COPY packages/shared ./packages/shared

# Build shared package first, then API
RUN pnpm --filter @stadiumops/shared build \
 && pnpm --filter @stadiumops/api build

# ---------- Stage 2: production deps ----------
FROM node:20-alpine AS deps

WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/api/package.json ./apps/api/package.json
COPY packages/shared/package.json ./packages/shared/package.json

# Prune devDependencies — runtime needs only prod deps
RUN pnpm install --frozen-lockfile --prod || pnpm install --prod

# ---------- Stage 3: runtime (distroless) ----------
# gcr.io/distroless/nodejs20-debian12: nonroot, no shell, no package manager.
# Smaller than alpine + node, and produces fewer CVEs over time.
FROM gcr.io/distroless/nodejs20-debian12:nonroot

WORKDIR /app

# Copy production node_modules (preserves workspace symlinks)
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules

# Copy compiled artifacts only — no TS source, no tests, no configs
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml

# Distroless already runs as nonroot uid 65534. Cloud Run will honor this.
# Set NODE_ENV for Fastify to enable production optimizations.
ENV NODE_ENV=production \
    PORT=8080 \
    FASTIFY_LOG_LEVEL=info

# Cloud Run injects PORT env; container must listen on it.
EXPOSE 8080

# No shell in distroless — must invoke node directly with the JS entry path.
CMD ["apps/api/dist/index.js"]
