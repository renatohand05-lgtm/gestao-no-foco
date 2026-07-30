#!/usr/bin/env node
/** Sprint 25.7 — Premium performance contracts */
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

console.log("\nPremium Performance — Sprint 25.7\n");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const deps = { ...pkg.dependencies, ...pkg.devDependencies };
assert(!deps["framer-motion"], "sem framer-motion");
assert(!deps["gsap"], "sem gsap");
assert(!deps["lottie-web"], "sem lottie");

const view = readFileSync(
  join(root, "components/dashboard/premium/premium-dashboard-view.tsx"),
  "utf8",
);
assert(view.includes("PremiumDisclosure"), "progressive disclosure");
assert(view.includes("defaultOpen: false"), "painéis sob demanda");

const pm = readFileSync(join(root, "lib/design-system/premium-motion.ts"), "utf8");
assert(pm.includes("CSS-first") || pm.includes("sem libs"), "motion CSS-first");

const chart = readFileSync(
  join(root, "components/dashboard/premium/premium-revenue-chart.tsx"),
  "utf8",
);
assert(!chart.includes("recharts"), "chart sem recharts pesado");
assert(chart.includes("svg"), "chart SVG nativo");

const loader = readFileSync(
  join(root, "components/brand/premium-global-loader.tsx"),
  "utf8",
);
assert(loader.includes("icon-192") || loader.includes("icon192"), "asset otimizado 192");

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
