# Stage 1: Install dependencies
FROM oven/bun:1 AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN bun install --frozen-lockfile

# Stage 2: Build web static files
FROM deps AS web-build
WORKDIR /app

ARG VITE_WIFI_SSID
ARG VITE_WIFI_PASSWORD
ARG VITE_FARO_URL=""
ARG VITE_BUILD_HASH=""
ENV VITE_WIFI_SSID=${VITE_WIFI_SSID}
ENV VITE_WIFI_PASSWORD=${VITE_WIFI_PASSWORD}
ENV VITE_FARO_URL=${VITE_FARO_URL}
ENV VITE_BUILD_HASH=${VITE_BUILD_HASH}

COPY apps/api/src apps/api/src
COPY apps/api/tsconfig.json apps/api/
COPY apps/web apps/web
COPY tsconfig.json ./
RUN cd apps/web && bun run build

# Stage 3: Production API server
FROM oven/bun:1-slim AS production
WORKDIR /app

ARG BUILD_HASH=dev
ENV BUILD_HASH=${BUILD_HASH}

COPY --from=deps /app/node_modules node_modules
COPY apps/api apps/api
COPY --from=web-build /app/apps/web/dist apps/api/public

ENV NODE_ENV=production
EXPOSE 4301

CMD ["bun", "apps/api/src/server.ts"]
