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

# Copy backend
COPY backend/package*.json ./backend/
RUN cd backend && npm install --production

COPY backend/ ./backend/

# Copy frontend build
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# Create database directory (Railway will mount volume here)
RUN mkdir -p /data/database

# Set environment
ENV NODE_ENV=production
ENV DATABASE_PATH=/data/database/crm.db

EXPOSE 3001

WORKDIR /app/backend
CMD ["node", "src/index.js"]
