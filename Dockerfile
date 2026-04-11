# Stage 1: Install dependencies
FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY libs/shared/package.json libs/shared/
RUN bun install --frozen-lockfile

# Stage 2: Build web static files
FROM deps AS web-build
WORKDIR /app
COPY libs/shared libs/shared
COPY apps/api/src/trpc/routers apps/api/src/trpc/routers
COPY apps/api/src/trpc/init.ts apps/api/src/trpc/init.ts
COPY apps/api/src/trpc/context.ts apps/api/src/trpc/context.ts
COPY apps/web apps/web
COPY tsconfig.json ./
RUN cd apps/web && bun run build

# Stage 3: Production API server
FROM oven/bun:1-slim AS production
WORKDIR /app

COPY --from=deps /app/node_modules node_modules
COPY libs/shared libs/shared
COPY apps/api apps/api
COPY --from=web-build /app/apps/web/dist apps/api/public

ENV NODE_ENV=production
EXPOSE 4301

CMD ["bun", "apps/api/src/server.ts"]
