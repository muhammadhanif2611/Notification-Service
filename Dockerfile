# =============================================================================
# NOTIFICATION GATEWAY — UNIFIED BACKEND PRODUCTION DOCKERFILE FOR RAILWAY
# =============================================================================
# Menjalankan ke-6 microservices dalam 1 container terpadu:
# - gateway-service (port 3001)
# - auth-service (port 3002)
# - client-service (port 3003)
# - notification-service (port 3004)
# - callback-log-service (port 3005)
# - dispatch-service (worker queue)
# =============================================================================

FROM node:22-alpine AS builder

WORKDIR /app

# Copy package descriptors
COPY package.json package-lock.json* ./
COPY packages/ ./packages/
COPY services/ ./services/
COPY scripts/ ./scripts/

# Install dependencies (production only, skip frontend)
RUN npm ci --only=production --ignore-scripts

FROM node:22-alpine

WORKDIR /app

# Buat user non-root demi keamanan
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy source dan node_modules dari builder
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/services ./services
COPY --from=builder /app/scripts ./scripts

# Folder sesi WhatsApp persisten
ENV WA_SESSION_PATH=/app/wa-sessions
RUN mkdir -p /app/wa-sessions && chown -R nodejs:nodejs /app

USER nodejs

# Expose port gateway (default 3001 atau $PORT Railway)
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=15s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3001/health', (r) => {if(r.statusCode !== 200) process.exit(1)})"

CMD ["node", "scripts/start-backend.js"]
