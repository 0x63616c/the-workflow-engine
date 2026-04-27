/**
 * Token enforcement.
 *
 * Components must consume only the semantic CSS tokens defined in
 * apps/web/src/styles/globals.css (bg-background, text-foreground, etc).
 *
 * This script bans:
 *   - raw hex colors (#abc, #aabbcc, #aabbccdd)
 *   - rgb()/rgba()/hsl()/hsla()/oklch()/oklab() in component code
 *   - Tailwind arbitrary color values: bg-[, text-[, ring-[, ...
 *   - Tailwind palette utilities: bg-red-500, text-blue-300, ...
 *
 * Bypass for genuinely necessary cases by adding `// allow-color: <reason>`
 * on the same or previous line. Reviewers see it in the diff.
 *
 * globals.css is the single source of color truth and is exempt.
 */

import { Glob } from "bun";

const SCAN = "apps/web/src/**/*.{ts,tsx,css}";
const EXEMPT = new Set(["apps/web/src/styles/globals.css"]);

interface Pattern {
  re: RegExp;
  label: string;
}

const PATTERNS: Pattern[] = [
  { re: /#[0-9a-fA-F]{3,8}\b/g, label: "raw hex color" },
  { re: /\b(rgb|rgba|hsl|hsla|oklch|oklab)\s*\(/g, label: "raw color function" },
  {
    re: /\b(bg|text|border|ring|fill|stroke|from|to|via|shadow|outline|divide|placeholder|caret|accent|decoration)-\[/g,
    label: "Tailwind arbitrary color value",
  },
  {
    re: /\b(bg|text|border|ring|fill|stroke|from|to|via|shadow|outline|divide|placeholder|caret|accent|decoration)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d+\b/g,
    label: "Tailwind palette utility",
  },
];

const ALLOW_COMMENT = /\/\/\s*allow-color:|\/\*\s*allow-color:/;

interface Violation {
  file: string;
  line: number;
  text: string;
  match: string;
  label: string;
}

const violations: Violation[] = [];

for await (const file of new Glob(SCAN).scan({ cwd: "." })) {
  if (EXEMPT.has(file)) continue;
  const text = await Bun.file(file).text();
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const prev = i > 0 ? lines[i - 1] : "";
    if (ALLOW_COMMENT.test(line) || ALLOW_COMMENT.test(prev)) continue;
    for (const { re, label } of PATTERNS) {
      re.lastIndex = 0;
      let m: RegExpExecArray | null = re.exec(line);
      while (m !== null) {
        violations.push({ file, line: i + 1, text: line.trim(), match: m[0], label });
        m = re.exec(line);
      }
    }
  }
}

if (violations.length > 0) {
  for (const v of violations) {
    console.error(`${v.file}:${v.line}  [${v.label}]  "${v.match}"`);
    console.error(`  ${v.text}`);
  }
  console.error(`\n${violations.length} token violation(s).`);
  console.error(
    "Use semantic tokens (bg-background, text-foreground, ...) defined in globals.css.",
  );
  console.error(
    "If you genuinely need a raw color, add `// allow-color: <reason>` above the line.",
  );
  process.exit(1);
}

console.log("Tokens: OK");
