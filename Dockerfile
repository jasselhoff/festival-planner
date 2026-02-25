# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/
COPY shared/package*.json ./shared/

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build client and server
RUN npm run build --workspace=client
RUN npm run build --workspace=server

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files for production install
COPY package*.json ./
COPY server/package*.json ./server/
COPY shared/package*.json ./shared/

# Install production dependencies only
RUN npm install --omit=dev --workspace=server

# Copy built files from builder stage
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/shared ./shared

# Create data directory for SQLite
RUN mkdir -p /app/data

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_PATH=/app/data/festival.db

EXPOSE 3000

# Start the server
CMD ["node", "server/dist/server.js"]
