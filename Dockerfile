# Dockerfile for Marriott Hotel Search MCP Server
# Note: This assumes mcp-local-main is a sibling directory
# For deployment, use the build script which handles this automatically

FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (needed for build)
# Use npm install instead of npm ci to handle lock file updates
RUN npm install

# Copy source files
COPY . .

# Build the application (this will build mcp-local-main and copy it)
# Note: This requires mcp-local-main to be available
# For Git-based deployments, ensure both directories are in the repo
RUN npm run build || echo "Build may fail if mcp-local-main not available - use deployment platforms instead"

# Install only production dependencies
RUN npm install --only=production

# Expose port
EXPOSE 3000

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start server
CMD ["node", "dist/hotel-server.js"]

