/**
 * Import boundary checker.
 * Enforces clean architecture import rules from CLAUDE.md.
 *
 * Rules:
 * - db/        → only drizzle-orm, pg, @repo/shared
 * - services/  → db/, integrations/evee/, integrations/slack/format, @repo/shared, @slack/web-api, env, lib/
 * - trpc/routers/ → services/, @repo/shared, ../init, ../context
 * - inngest/functions/ → services/, inngest, @repo/shared, ../client, env (prefer services/ over direct db/integration imports)
 * - integrations/slack/ → @repo/shared, @slack/, db/, inngest/, lib/, env, services/ (thin adapter pattern)
 */

import { Glob } from "bun";

const API_SRC = "apps/api/src";

interface Rule {
  pattern: string;
  allowed: RegExp[];
  label: string;
}

const rules: Rule[] = [
  {
    pattern: `${API_SRC}/db/**/*.ts`,
    label: "db/",
    allowed: [
      /^drizzle-orm/,
      /^pg$/,
      /^node:/,
      /^nanoid/,
      /^@repo\/shared/,
      /^\./, // relative imports within db/
    ],
  },
  {
    pattern: `${API_SRC}/services/**/*.ts`,
    label: "services/",
    allowed: [
      /^\./, // relative imports
      /^@repo\/shared/,
      /^drizzle-orm/, // query operators (asc, desc, gte, lt, sql, eq)
      /^@slack\/web-api/, // for Slack messaging (sendSlackResponse)
      /^inngest/, // NonRetriableError for permanent Slack errors in sendSlackResponse
      /^yahoo-finance2$/, // stock quote fetching
      /\.\.\/db\//,
      /\.\.\/integrations\/types/, // existing integration type boundaries
      /\.\.\/integrations\/evee\//, // evee LLM, messages, tools, types
      /\.\.\/integrations\/slack\/format/, // toSlackMrkdwn
      /\.\.\/lib\//, // logger
      /\.\.\/env/, // env config
    ],
  },
  {
    pattern: `${API_SRC}/trpc/routers/**/*.ts`,
    label: "trpc/routers/",
    allowed: [
      /^\./, // relative imports
      /^@repo\/shared/,
      /^@trpc\//,
      /^zod/,
      /\.\.\/init/,
      /\.\.\/context/,
      /\.\.\/\.\.\/services\//,
    ],
  },
  {
    pattern: `${API_SRC}/inngest/functions/**/*.ts`,
    label: "inngest/functions/",
    allowed: [
      /^\.\//, // intra-directory imports (same folder)
      /^@repo\/shared/,
      /^inngest/,
      /^@ai-sdk\/provider/,
      /^ai$/,
      /^@slack\/web-api/,
      /^drizzle-orm/,
      /\.\.\/client/,
      /\.\.\/\.\.\/services\//,
      /\.\.\/\.\.\/db\//,
      /\.\.\/\.\.\/integrations\/evee\//,
      /\.\.\/\.\.\/integrations\/slack\/constants/,
      /\.\.\/\.\.\/integrations\/slack\/format/,
      /\.\.\/\.\.\/env/,
    ],
  },
  {
    pattern: `${API_SRC}/integrations/evee/**/*.ts`,
    label: "integrations/evee/",
    allowed: [
      /^\./, // relative imports
      /^@repo\/shared/,
      /^@openrouter\//,
      /^ai$/,
      /^zod/,
      /\.\.\/\.\.\/env/,
      /\.\.\/\.\.\/db\//,
    ],
  },
  {
    pattern: `${API_SRC}/integrations/slack/**/*.ts`,
    label: "integrations/slack/",
    allowed: [
      /^\./, // relative imports
      /^@repo\/shared/,
      /^@slack\//,
      /^slackify-markdown/,
      /^drizzle-orm/,
      /\.\.\/\.\.\/env/,
      /\.\.\/\.\.\/db\//,
      /\.\.\/\.\.\/inngest\//,
      /\.\.\/\.\.\/lib\//,
      // Slack handler is a thin adapter that delegates to the service layer.
      // Importing services/ here is intentional: the handler upserts conversations,
      // persists messages, and downloads images via evee-service before firing Inngest events.
      /\.\.\/\.\.\/services\//,
    ],
  },
];

const importPattern = /(?:import|from)\s+['"]([^'"]+)['"]/g;

let violations = 0;

for (const rule of rules) {
  const glob = new Glob(rule.pattern);
  for await (const file of glob.scan({ cwd: "." })) {
    const content = await Bun.file(file).text();
    for (const match of content.matchAll(importPattern)) {
      const importPath = match[1];
      const isAllowed = rule.allowed.some((r) => r.test(importPath));
      if (!isAllowed) {
        console.error(`BOUNDARY VIOLATION in ${file} (${rule.label}): import "${importPath}"`);
        violations++;
      }
    }
  }
}

if (violations > 0) {
  console.error(`\n${violations} import boundary violation(s) found.`);
  process.exit(1);
} else {
  console.log("Import boundaries: OK");
}
