# Build stage for frontend
FROM node:18-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Production stage
FROM node:18-alpine
WORKDIR /app

# Install dependencies for better-sqlite3 (needs python and build tools)
RUN apk add --no-cache python3 make g++

# Copy backend
COPY backend/package*.json ./backend/
RUN cd backend && npm install --production

COPY backend/ ./backend/

# Copy frontend build
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# Create database directory (Railway will mount volume here)
RUN mkdir -p /app/data

# Set environment
ENV NODE_ENV=production
ENV DATABASE_PATH=/app/data/crm.db

# Copy startup script
COPY scripts/railway-start.sh /app/start.sh
RUN chmod +x /app/start.sh

EXPOSE 3001

WORKDIR /app/backend

# Run startup script (handles DB cleanup and directory creation)
CMD ["/app/start.sh"]
