import { resolve } from "node:path";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { serve } from "inngest/bun";

import { EFFECTIVE_PORT, env } from "./env";
import { inngest } from "./inngest/client";
import { ha } from "./integrations/homeassistant";
import { createContext } from "./trpc/context";
import { appRouter } from "./trpc/routers";

await ha.init();

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
        url.pathname === "/favicon.ico";
      if (!skip) {
        const level = status >= 500 ? "ERROR" : status >= 400 ? "WARN" : "INFO";
        console.log(
          `${new Date().toISOString()} [${level}] ${req.method} ${url.pathname} ${status} ${duration}ms`,
        );
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
          console.error(
            `${new Date().toISOString()} [ERROR] tRPC ${path ?? "unknown"}: ${error.message}`,
          );
        },
      });
      return respond(res);
    }

    if (url.pathname.startsWith("/api/inngest")) {
      return respond(await inngestHandler(req));
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

console.log(
  `🚀 API running on http://localhost:${server.port} (${env.NODE_ENV}) [${env.BUILD_HASH}]`,
);
