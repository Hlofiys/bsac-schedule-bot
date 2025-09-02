# Multi-stage Dockerfile for BSAC Schedule Bot

# Builder stage
FROM node:alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies including build tools
RUN npm ci --only=production && \
    npm install typescript --save-dev && \
    npm cache clean --force

# Copy source code
COPY src/ ./src/
COPY tsconfig.json ./

# Compile TypeScript to JavaScript
RUN npx tsc

# Production stage
FROM node:alpine AS production

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 -G nodejs

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy compiled JavaScript from builder stage
COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist

# Create sessions directory with proper permissions
RUN mkdir -p /app/sessions && \
    chown -R nextjs:nodejs /app/sessions

# Switch to non-root user
USER nextjs

# Expose port (if your bot has a web interface)
# EXPOSE 3000

# Health check (optional)
# HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
#   CMD node healthcheck.js

# Start the bot
CMD ["node", "dist/index.js"]