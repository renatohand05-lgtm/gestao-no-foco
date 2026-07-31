#!/usr/bin/env node
/** Sprint 26.2.1 — Light theme contrast (tokens + superfícies) */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0;
let fail = 0;
function assert(cond, msg) {
  if (cond) {
    pass++;
    console.log(`  PASS  ${msg}`);
  } else {
    fail++;
    console.log(`  FAIL  ${msg}`);
  }
}

console.log("\nLight Theme Contrast — Sprint 26.2.1\n");

const css = readFileSync(join(root, "app/globals.css"), "utf8");
assert(css.includes("--background: #f0f2f6"), "wash frio");
assert(css.includes("--foreground: #12151a"), "foreground escuro");
assert(css.includes("--card: #ffffff") || css.includes("--card: #fff"), "card branco");
assert(css.includes("--muted-foreground: #3f4754"), "muted-foreground AA");
assert(css.includes("--text-primary: #12151a"), "text-primary AA");
assert(css.includes("--text-secondary: #3f4754"), "text-secondary AA");
assert(css.includes("--text-muted: #5a6572"), "text-muted AA");
assert(css.includes("--border: #d5dbe3"), "borda visível");
assert(!css.includes("#ebe6df"), "rejeita marfim");

const analytics = readFileSync(
  join(root, "components/analytics/executive-analytics-dashboard.tsx"),
  "utf8",
);
assert(analytics.includes("data-analytics-legible"), "marker analytics legível");
assert(analytics.includes("text-foreground"), "título com foreground");

const nav = readFileSync(
  join(root, "components/analytics/analytics-navigation.tsx"),
  "utf8",
);
assert(nav.includes("text-[var(--text-secondary)]"), "tabs com contraste");

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
