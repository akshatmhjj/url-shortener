# Multi-stage build for production-ready image

# Stage 1: Install production dependencies
FROM node:22-alpine AS dependencies

WORKDIR /app

# Copy package files from backend directory
COPY url-shortener-backend/package*.json ./

# The API has no compile step. Excluding development tools keeps the final
# image smaller and avoids shipping nodemon to production.
RUN npm ci --omit=dev

# Stage 2: Runtime
FROM node:22-alpine

WORKDIR /app

# Install dumb-init for proper signal handling and create an unprivileged user.
RUN apk add --no-cache dumb-init \
    && addgroup -S app \
    && adduser -S app -G app

# Copy node_modules from builder
COPY url-shortener-backend/package*.json ./
COPY --from=dependencies /app/node_modules ./node_modules

# Copy application code from backend directory
COPY --chown=app:app url-shortener-backend/src ./src

# Create logs directory
RUN mkdir -p logs && chown -R app:app /app

# Set environment
ENV NODE_ENV=production

USER app

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "const request=require('http').get('http://127.0.0.1:3000/health',res=>process.exit(res.statusCode===200?0:1));request.on('error',()=>process.exit(1));request.setTimeout(5000,()=>{request.destroy();process.exit(1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start server
CMD ["node", "src/server.js"]
