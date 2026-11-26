FROM node:22-bookworm-slim AS base
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/
RUN npm ci --workspace=server --include-workspace-root --no-audit --no-fund

COPY policy ./policy
COPY server ./server

RUN npx --workspace=server prisma generate
RUN npm --workspace=server run build

EXPOSE 4000
CMD ["sh", "-c", "npx --workspace=server prisma migrate deploy && npm --workspace=server run db:seed && node server/dist/server.js"]
