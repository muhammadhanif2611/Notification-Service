# Stage 1: Install dependencies
FROM node:22-alpine AS deps
WORKDIR /app

# Copy package files (root + frontend workspace)
COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/

# Install hanya dependency frontend workspace
RUN npm ci --workspace=frontend --include-workspace-root=false && \
    ln -s /app/node_modules ./frontend/node_modules

# Stage 2: Build
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY frontend ./frontend
COPY --from=deps /app/frontend/node_modules ./frontend/node_modules

# API URL dibaca saat build (bisa dioverride via build-arg)
ARG NEXT_PUBLIC_API_URL=http://127.0.0.1:3001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build --workspace=frontend

# Stage 3: Production runner
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Copy hasil build standalone (sudah termasuk node_modules minimal)
COPY --from=builder --chown=nextjs:nodejs /app/frontend/.next/standalone ./

# Pada monorepo, standalone server.js berada di root /app, sehingga
# static & public HARUS ditempatkan di /app/.next/static dan /app/public
# (bukan di ./frontend/) agar terbaca oleh server.
COPY --from=builder --chown=nextjs:nodejs /app/frontend/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/frontend/public ./public

# Verifikasi lokasi server.js (monorepo standalone bisa nested di ./frontend/)
RUN test -f server.js || test -f frontend/server.js

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=15s --start-period=25s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/login', (r) => {if(r.statusCode !== 200) process.exit(1)})"

CMD ["sh", "-c", "if [ -f frontend/server.js ]; then exec node frontend/server.js; else exec node server.js; fi"]