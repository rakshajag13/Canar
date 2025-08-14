# AWS Cloud Deployment Guide for CPM Project

## Overview

This guide provides step-by-step instructions for deploying the CPM (Canar SPA Profile Builder) project to AWS Cloud with production-ready settings. The deployment will use AWS services for scalability, security, and reliability.

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Route 53      │    │   CloudFront    │    │   S3 Static     │
│   (DNS)         │────│   (CDN)         │────│   (Frontend)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Application   │    │   RDS           │    │   ElastiCache   │
│   Load Balancer │────│   PostgreSQL    │────│   Redis         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │
         ▼
┌─────────────────┐
│   ECS Fargate   │
│   (Backend)     │
└─────────────────┘
```

## Prerequisites

### AWS Account Setup

1. **AWS Account**: Active AWS account with billing enabled
2. **IAM User**: User with appropriate permissions (AdministratorAccess for simplicity)
3. **AWS CLI**: Installed and configured locally
4. **Domain Name**: Registered domain (optional but recommended)

### Local Development Setup

1. **Node.js 18+**: Installed locally
2. **Docker**: Installed for containerization
3. **Git**: For version control

## Step 1: Project Preparation

### 1.1 Environment Configuration

Create production environment files:

```bash
# Create production environment file
cp .env.example .env.production
```

**`.env.production` Configuration:**

```bash
# Database
DATABASE_URL=postgresql://${DB_USERNAME}:${DB_PASSWORD}@${DB_HOST}:5432/${DB_NAME}

# Authentication
AUTH_STRATEGY=jwt
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=7d
SESSION_SECRET=${SESSION_SECRET}

# Environment
NODE_ENV=production
PORT=5000

# Security
CORS_ORIGIN=https://yourdomain.com
RATE_LIMIT_WINDOW=15m
RATE_LIMIT_MAX_REQUESTS=100

# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
S3_BUCKET_NAME=${S3_BUCKET_NAME}

# Redis (for caching)
REDIS_URL=${REDIS_URL}

# Monitoring
SENTRY_DSN=${SENTRY_DSN}
LOG_LEVEL=info
```

### 1.2 Docker Configuration

**`Dockerfile` (Backend):**

```dockerfile
# Multi-stage build for production
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY drizzle.config.ts ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY server/ ./server/
COPY shared/ ./shared/

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/api/auth/health || exit 1

# Start the application
CMD ["npm", "start"]
```

**`Dockerfile.client` (Frontend):**

```dockerfile
# Multi-stage build for frontend
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY tailwind.config.ts ./
COPY postcss.config.js ./
COPY vite.config.ts ./

# Install dependencies
RUN npm ci

# Copy source code
COPY client/ ./client/
COPY shared/ ./shared/

# Build the application
RUN npm run build

# Production stage with nginx
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
```

**`nginx.conf`:**

```nginx
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    server {
        listen 80;
        server_name localhost;
        root /usr/share/nginx/html;
        index index.html;

        # Handle client-side routing
        location / {
            try_files $uri $uri/ /index.html;
        }

        # API proxy to backend
        location /api/ {
            proxy_pass http://backend:5000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # Static file caching
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

### 1.3 Docker Compose for Local Testing

**`docker-compose.yml`:**

```yaml
version: "3.8"

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: canar_db
      POSTGRES_USER: canar_user
      POSTGRES_PASSWORD: canar_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U canar_user -d canar_db"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: .
      dockerfile: Dockerfile
    environment:
      DATABASE_URL: postgresql://canar_user:canar_password@postgres:5432/canar_db
      REDIS_URL: redis://redis:6379
      NODE_ENV: production
      AUTH_STRATEGY: jwt
      JWT_SECRET: your-super-secure-jwt-secret-key
      JWT_EXPIRES_IN: 7d
      SESSION_SECRET: your-session-secret-key
      CORS_ORIGIN: http://localhost:3000
    ports:
      - "5000:5000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/api/auth/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build:
      context: .
      dockerfile: Dockerfile.client
    ports:
      - "3000:80"
    depends_on:
      - backend

volumes:
  postgres_data:
  redis_data:
```
