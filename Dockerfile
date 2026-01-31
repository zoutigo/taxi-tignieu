# ---- deps ----
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Prisma v6 exige DATABASE_URL même pour `prisma generate`.
# On fournit un ARG avec valeur neutre qui peut être remplacée au build.
ARG DATABASE_URL="mysql://user:pass@localhost:3306/placeholder"
ENV DATABASE_URL=${DATABASE_URL}

# Copy package manifests and Prisma schema so @prisma/client can generate correctlys
COPY package*.json ./
COPY prisma ./prisma

RUN npm ci
RUN npx prisma generate

# ---- builder ----
FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Reprise de l'ARG pour cette étape
ARG DATABASE_URL="mysql://user:pass@localhost:3306/placeholder"
ENV DATABASE_URL=${DATABASE_URL}

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Ensure Prisma client is present (safety)
RUN npx prisma generate

# Avoid hitting DB during build (same pattern as SMC)
ENV SKIP_DB_ON_BUILD=1
RUN npm run build

# ---- runner ----
FROM node:22-alpine AS runner
RUN apk add --no-cache libc6-compat
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

# Keep exact node_modules to avoid npm exec auto-installing Prisma in runner
COPY --from=builder /app/node_modules ./node_modules

# App assets (Next standalone)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Prisma config & schema for runtime (migrations)
# (si tu n'as pas prisma.config.js, supprime juste cette ligne)
COPY --from=builder /app/prisma.config.js ./prisma.config.js
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000
CMD ["node", "server.js"]
