# Multi-stage Dockerfile for NORMA MCP Server (Node.js + TypeScript)
# Optimized for Cloud Run cold-start (RESEARCH.md Pitfall 7 — fat images
# blow cold start). node:22-alpine keeps the runtime image ~150 MB.

# ============================================
# Stage 1: Production dependencies only
# ============================================
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

# ============================================
# Stage 2: Build (compiles TypeScript to dist/)
# ============================================
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# ============================================
# Stage 3: Runtime (minimal image)
# ============================================
FROM node:22-alpine AS runtime
WORKDIR /app

# Copy production dependencies + built artifacts
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./

# Drop privileges — node:22-alpine ships a non-root `node` user
USER node

# Cloud Run injects PORT env var; default to 8080 for parity.
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

# server.ts listens on process.env.PORT || 8080
CMD ["node", "dist/server.js"]
