# 1. Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency files first
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install

# Copy project files
COPY . .

# ✅ Generate Prisma client inside the container
RUN npx prisma generate

# ✅ Build NestJS
RUN pnpm run build

# 2. Runtime stage
FROM node:20-alpine AS runner

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --prod

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma

EXPOSE 8000
CMD ["node", "dist/main.js"]
