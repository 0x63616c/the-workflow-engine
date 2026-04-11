import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { serve } from "inngest/bun";

import { EFFECTIVE_PORT } from "./env";
import { inngest } from "./inngest/client";
import { createContext } from "./trpc/context";
import { appRouter } from "./trpc/routers";

const inngestHandler = serve({
  client: inngest,
  functions: [],
});

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

    return new Response("Not Found", { status: 404 });
  },
});

console.log(`API: http://localhost:${server.port}`);
