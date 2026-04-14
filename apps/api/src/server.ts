import { resolve } from "node:path";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { serve } from "inngest/bun";

import { pool } from "./db/client";
import { runMigrations } from "./db/migrate";
import { EFFECTIVE_PORT, env } from "./env";
import { inngest } from "./inngest/client";
import { ha } from "./integrations/homeassistant";
import { haRelay } from "./integrations/homeassistant/ws-relay";
import { initSlack, stopSlack } from "./integrations/slack";
import { log } from "./lib/logger";
import { createContext } from "./trpc/context";
import { appRouter } from "./trpc/routers";

await runMigrations();
await ha.init();
haRelay.connect();
await initSlack();

const inngestHandler = serve({
  client: inngest,
  functions: [],
});

const isProduction = env.NODE_ENV === "production";
const publicDir = resolve(import.meta.dir, "../public");

const server = Bun.serve({
  port: EFFECTIVE_PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const start = Date.now();

    const respond = (res: Response) => {
      const duration = Date.now() - start;
      const status = res.status;
      // Skip logging static assets and health checks to keep logs clean
      const skip =
        url.pathname.startsWith("/assets/") ||
        url.pathname === "/up" ||
        url.pathname === "/favicon.ico" ||
        url.pathname === "/api/collect";
      if (!skip) {
        const entry = { method: req.method, path: url.pathname, status, duration_ms: duration };
        if (status >= 500) {
          log.error(entry, "request");
        } else if (status >= 400) {
          log.warn(entry, "request");
        } else {
          log.info(entry, "request");
        }
      }
      return res;
    };

    if (url.pathname === "/up") {
      return new Response("OK", { status: 200 });
    }

    if (url.pathname.startsWith("/trpc")) {
      const res = await fetchRequestHandler({
        endpoint: "/trpc",
        req,
        router: appRouter,
        createContext,
        onError: ({ path, error }) => {
          log.error(
            { path: path ?? "unknown", code: error.code, error: error.message },
            "tRPC error",
          );
        },
      });
      return respond(res);
    }

    if (url.pathname.startsWith("/api/inngest")) {
      return respond(await inngestHandler(req));
    }

    // Faro telemetry proxy -> Alloy faro.receiver
    if (url.pathname === "/api/collect") {
      try {
        const body = await req.text();
        const upstream = await fetch(`${env.ALLOY_URL}/collect`, {
          method: req.method,
          headers: {
            "Content-Type": req.headers.get("Content-Type") ?? "application/json",
          },
          body: req.method !== "GET" ? body : undefined,
        });
        return respond(new Response(upstream.body, { status: upstream.status }));
      } catch {
        return respond(new Response("Bad Gateway", { status: 502 }));
      }
    }

    // In production, serve built web assets from public/
    if (isProduction) {
      const filePath = url.pathname === "/" ? "/index.html" : url.pathname;
      const file = Bun.file(resolve(publicDir, `.${filePath}`));
      if (await file.exists()) return respond(new Response(file));
      // SPA fallback: serve index.html for client-side routes
      return respond(new Response(Bun.file(resolve(publicDir, "index.html"))));
    }

    return respond(new Response("Not Found", { status: 404 }));
  },
});

log.info({ port: server.port, env: env.NODE_ENV, build: env.BUILD_HASH }, "API started");

const shutdown = async () => {
  await stopSlack();
  haRelay.destroy();
  await pool.end();
  process.exit(0);
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
