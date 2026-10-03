# ==============================================================================
# ExzaEstate Monorepo Multi-Stage Dockerfile (Root entrypoint)
# See docker/Dockerfile for architecture details
# ==============================================================================

# ------------------------------------------------------------------------------
# 1. Base Stage: Node.js 24 LTS Bookworm Slim with pnpm
# ------------------------------------------------------------------------------
FROM node:24-bookworm-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV CI=true

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    curl \
  && rm -rf /var/lib/apt/lists/* \
  && corepack enable \
  && corepack prepare pnpm@12.8.2 --activate

# ------------------------------------------------------------------------------
# 2. Dependencies & Build Stage
# ------------------------------------------------------------------------------
FROM base AS builder

WORKDIR /app

# Placeholder for build-time Prisma client generation
ENV DATABASE_URL="postgresql://exza_app:exza_app_secret@localhost:5432/exzaestate?schema=public"

# Copy root configurations and workspace manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/config/package.json ./packages/config/
COPY packages/shared/package.json ./packages/shared/
COPY packages/api-client/package.json ./packages/api-client/
COPY packages/app-core/package.json ./packages/app-core/
COPY packages/features/package.json ./packages/features/
COPY packages/ui/package.json ./packages/ui/
COPY apps/backend/package.json ./apps/backend/
COPY apps/desktop/package.json ./apps/desktop/
COPY apps/web/package.json ./apps/web/

# Install workspace dependencies
RUN pnpm install --frozen-lockfile

# Copy source trees
COPY packages/ ./packages/
COPY apps/backend/ ./apps/backend/

# Generate Prisma client with multi-file schema
RUN pnpm --filter @exzaestate/backend exec prisma generate

# Build shared packages
RUN pnpm --filter @exzaestate/shared build

# ------------------------------------------------------------------------------
# 3. Target: API (Slim NestJS REST API)
# ------------------------------------------------------------------------------
FROM base AS api

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV RUNTIME_MODE=cloud

# Copy built application and node_modules from builder
COPY --from=builder /app /app

EXPOSE 3000

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/api/v1/health || exit 1

# Non-root user
USER node

# Start NestJS API entrypoint (main.ts)
CMD ["pnpm", "--filter", "@exzaestate/backend", "exec", "tsx", "src/main.ts"]

# ------------------------------------------------------------------------------
# 4. Target: Worker (BullMQ Background Worker + Chromium + Fonts)
# ------------------------------------------------------------------------------
FROM base AS worker

WORKDIR /app

ENV NODE_ENV=production
ENV RUNTIME_MODE=cloud
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV CHROME_PATH=/usr/bin/chromium

# Install Chromium and fonts (Inter and Noto Sans Bengali for authentic PDF reports)
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-noto \
    fonts-noto-cjk \
    fonts-freefont-ttf \
    fonts-ipafont-gothic \
  && rm -rf /var/lib/apt/lists/*

# Copy built application and node_modules from builder
COPY --from=builder /app /app

# Non-root user
USER node

# Start Worker entrypoint (main.worker.ts)
CMD ["pnpm", "--filter", "@exzaestate/backend", "exec", "tsx", "src/main.worker.ts"]
