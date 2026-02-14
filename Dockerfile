# Build Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Build Backend
FROM node:20-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install
COPY backend/ ./
RUN npm run build

# Production Runtime
FROM node:20-alpine
WORKDIR /app

# Install production dependencies for backend
COPY backend/package*.json ./
RUN npm install --production

# Copy built backend
COPY --from=backend-builder /app/backend/dist ./dist

# Copy built frontend to public folder (served by backend)
COPY --from=frontend-builder /app/frontend/dist ./public

# Copy other necessary files
COPY backend/.env.example ./.env
COPY config.yml /config.yml
# COPY backend/database.sqlite ./database.sqlite # Don't copy DB, use volume

EXPOSE 3000

CMD ["node", "dist/index.js"]
