# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY services/client-service/package.json ./services/client-service/
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
COPY services/client-service ./services/client-service

# Set ownership
RUN chown -R nodejs:nodejs /app

USER nodejs

# Expose port
EXPOSE 3003

# Health check
HEALTHCHECK --interval=30s --timeout=15s --start-period=25s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3003/health', (r) => {if(r.statusCode !== 200) process.exit(1)})"

# Start service
CMD ["node", "services/client-service/src/server.js"]
