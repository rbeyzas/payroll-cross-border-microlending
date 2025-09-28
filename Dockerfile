# Use the official Liquid Auth Dockerfile as base
# This Dockerfile is for building Liquid Auth from source
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    git \
    python3 \
    make \
    g++

# Clone Liquid Auth repository
RUN git clone https://github.com/algorandfoundation/liquid-auth.git .

# Install dependencies
RUN npm ci --only=production

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S liquidauth -u 1001

# Change ownership of the app directory
RUN chown -R liquidauth:nodejs /app
USER liquidauth

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js || exit 1

# Start the application
CMD ["npm", "start"]
