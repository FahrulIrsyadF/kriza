FROM node:22-alpine

WORKDIR /app

# Manifest dulu supaya layer install ter-cache selama dependency tidak berubah
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/

RUN npm ci --omit=dev --workspace=apps/api --include-workspace-root

COPY apps/api apps/api
COPY packages/shared packages/shared

ENV NODE_ENV=production
USER node

# Migration idempotent: yang sudah pernah jalan di-skip drizzle
CMD ["sh", "-c", "node apps/api/src/db/migrate.js && node apps/api/src/server.js"]
