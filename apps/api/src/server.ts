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

function cacheHeaders(filePath: string): Headers {
  const headers = new Headers();
  if (filePath.endsWith(".html")) {
    // HTML must never be cached — it's the entry point that references hashed assets
    headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
    headers.set("Pragma", "no-cache");
    headers.set("Expires", "0");
  } else if (/\.[a-f0-9]{8,}\.(js|css|woff2?|png|jpg|svg)$/.test(filePath)) {
    // Vite hashed assets are immutable — cache forever
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
  } else {
    // Other static files (manifest.json, favicon, etc.) — short cache with revalidation
    headers.set("Cache-Control", "public, max-age=3600, must-revalidate");
  }
  return headers;
}

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

      if (await file.exists()) {
        const headers = cacheHeaders(filePath);
        return new Response(file, { headers });
      }

      // SPA fallback: serve index.html for client-side routes
      return new Response(Bun.file(resolve(publicDir, "index.html")), {
        headers: cacheHeaders("/index.html"),
      });
    }

    return new Response("Not Found", { status: 404 });
  },
});

console.log(`API: http://localhost:${server.port}`);
