# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY services/dispatch-service/package.json ./services/dispatch-service/
COPY packages/shared/package.json ./packages/shared/
COPY packages/database/package.json ./packages/database/

# Copy source code packages
COPY packages/shared/src ./packages/shared/src
COPY packages/database/src ./packages/database/src

# Install dependencies
RUN npm ci --only=production

# Stage 2: Production
FROM node:22-alpine

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages

# Copy service source
COPY services/dispatch-service ./services/dispatch-service

# Set ownership
RUN chown -R nodejs:nodejs /app

USER nodejs

# No port exposed (worker service)

# Folder penyimpanan sesi WhatsApp (Baileys) — mount volume agar persisten
ENV WA_SESSION_PATH=/app/wa-sessions
RUN mkdir -p /app/wa-sessions && chown -R nodejs:nodejs /app/wa-sessions

# Health check - check if process is running
HEALTHCHECK --interval=30s --timeout=15s --start-period=25s --retries=3 \
  CMD pgrep -f "node.*index.js" || exit 1

# Start worker
CMD ["node", "services/dispatch-service/src/index.js"]
