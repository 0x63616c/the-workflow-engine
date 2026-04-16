/**
 * Import boundary checker.
 * Enforces clean architecture import rules from CLAUDE.md.
 *
 * Rules:
 * - db/        → only drizzle-orm, pg, nanoid, @repo/shared
 * - services/  → db/, integrations/types, @repo/shared
 * - trpc/routers/ → services/, @repo/shared, ../init, ../context
 * - inngest/functions/ → services/, @repo/shared
 * - integrations/ (except types.ts) → @repo/shared, own files
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
      /^nanoid$/, // ID generation utility
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
      /\.\.\/db\//,
      /\.\.\/integrations\/types/,
      /^yahoo-finance2$/, // stock quote fetching
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
      /^\./, // relative imports
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
      /^@openrouter\//, // legacy LLM (removed in evee-5)
      /^ai$/, // legacy LLM (removed in evee-5)
      /^pino$/, // legacy LLM logger (removed in evee-5)
      /^zod/, // legacy tool definitions (removed in evee-5)
      /^slackify-markdown/,
      /^drizzle-orm/,
      /\.\.\/\.\.\/env/,
      /\.\.\/\.\.\/db\//,
      /\.\.\/\.\.\/inngest\//,
      /\.\.\/\.\.\/lib\//,
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
