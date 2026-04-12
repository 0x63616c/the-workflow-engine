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

    if (url.pathname.startsWith("/trpc")) {
      return fetchRequestHandler({
        endpoint: "/trpc",
        req,
        router: appRouter,
        createContext,
      });
    }

    if (url.pathname.startsWith("/api/inngest")) {
      return inngestHandler(req);
    }

    // In production, serve built web assets from public/
    if (isProduction) {
      const filePath = url.pathname === "/" ? "/index.html" : url.pathname;
      const file = Bun.file(resolve(publicDir, `.${filePath}`));
      if (await file.exists()) return new Response(file);
      // SPA fallback: serve index.html for client-side routes
      return new Response(Bun.file(resolve(publicDir, "index.html")));
    }

    return new Response("Not Found", { status: 404 });
  },
});

console.log(`API: http://localhost:${server.port}`);
