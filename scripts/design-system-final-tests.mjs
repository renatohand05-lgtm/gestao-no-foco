#!/usr/bin/env node
/** Sprint 25.7 — Design System final */
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

console.log("\nDesign System Final — Sprint 25.7\n");
const css = readFileSync(join(root, "app/globals.css"), "utf8");
const tokens = [
  "--brand-gold",
  "--brand-gold-soft",
  "--brand-gold-muted",
  "--surface-base",
  "--surface-raised",
  "--surface-overlay",
  "--surface-interactive",
  "--border-subtle",
  "--border-premium",
  "--text-primary",
  "--text-secondary",
  "--text-muted",
  "--shadow-card",
  "--shadow-elevated",
  "--glow-gold",
  "--dashboard-max-width",
  "--dashboard-gutter",
  "--dashboard-gap",
];
for (const t of tokens) assert(css.includes(t), `token ${t}`);

const idx = readFileSync(join(root, "lib/design-system/index.ts"), "utf8");
assert(idx.includes("premiumMotion"), "export premiumMotion");
assert(idx.includes("premiumSurfaces"), "export premiumSurfaces");
assert(idx.includes("premiumType"), "export premiumType");

const pm = readFileSync(join(root, "lib/design-system/premium-motion.ts"), "utf8");
assert(pm.includes("premiumType"), "tipografia premium");
assert(pm.includes("metric"), "metric type");

const found = readFileSync(join(root, "lib/design-system/foundation.ts"), "utf8");
assert(found.includes("enter:"), "gofMotion.enter");

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
