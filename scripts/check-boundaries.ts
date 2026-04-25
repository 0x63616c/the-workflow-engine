/**
 * Import boundary checker.
 * Enforces clean architecture import rules from CLAUDE.md.
 *
 * Rules:
 * - db/        → drizzle-orm, pg, relative
 * - services/  → db/, integrations/evee/, integrations/slack/format, drizzle-orm, @slack/web-api, ai, @ai-sdk/provider, lib/, env
 * - trpc/routers/ → services/, @trpc/, zod, ../init, ../context
 * - integrations/evee/ → @openrouter/, ai, zod, db/, env
 * - integrations/slack/ → @slack/, slackify-markdown, drizzle-orm, db/, services/, lib/, env
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
    allowed: [/^drizzle-orm/, /^pg$/, /^node:/, /^nanoid/, /^\./],
  },
  {
    pattern: `${API_SRC}/services/**/*.ts`,
    label: "services/",
    allowed: [
      /^\./, // relative imports
      /^drizzle-orm/,
      /^@slack\/web-api/,
      /^yahoo-finance2$/,
      /^ai$/,
      /^@ai-sdk\/provider/,
      /\.\.\/db\//,
      /\.\.\/integrations\/types/,
      /\.\.\/integrations\/evee\//,
      /\.\.\/integrations\/slack\/constants/,
      /\.\.\/integrations\/slack\/format/,
      /\.\.\/lib\//,
      /\.\.\/env/,
    ],
  },
  {
    pattern: `${API_SRC}/trpc/routers/**/*.ts`,
    label: "trpc/routers/",
    allowed: [/^\./, /^@trpc\//, /^zod/, /\.\.\/init/, /\.\.\/context/, /\.\.\/\.\.\/services\//],
  },
  {
    pattern: `${API_SRC}/integrations/evee/**/*.ts`,
    label: "integrations/evee/",
    allowed: [/^\./, /^@openrouter\//, /^ai$/, /^zod/, /\.\.\/\.\.\/env/, /\.\.\/\.\.\/db\//],
  },
  {
    pattern: `${API_SRC}/integrations/slack/**/*.ts`,
    label: "integrations/slack/",
    allowed: [
      /^\./,
      /^@slack\//,
      /^slackify-markdown/,
      /^drizzle-orm/,
      /\.\.\/\.\.\/env/,
      /\.\.\/\.\.\/db\//,
      /\.\.\/\.\.\/lib\//,
      // Slack handler is a thin adapter that delegates to the service layer.
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
