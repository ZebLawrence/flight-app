# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Build the Next.js application
FROM node:20-alpine AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# Compile migration script into a self-contained CJS bundle
RUN npx esbuild scripts/migrate.ts --bundle --platform=node --format=cjs --outfile=scripts/migrate.js

# Stage 3: Production runtime image
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

# Install curl for health checks and run as non-root user for security
RUN apk add --no-cache curl && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy only the standalone output and static assets
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public

# Copy compiled migration script, drizzle migration files, and entrypoint
COPY --from=build --chown=nextjs:nodejs /app/scripts/migrate.js ./scripts/migrate.js
COPY --from=build --chown=nextjs:nodejs /app/drizzle ./drizzle
COPY --chown=nextjs:nodejs scripts/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["./entrypoint.sh"]
