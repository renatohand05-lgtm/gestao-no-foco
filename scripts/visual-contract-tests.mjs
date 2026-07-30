#!/usr/bin/env node
/**
 * Sprint 25.5 — Visual contract vs referência mínima
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { brandConfig, brandPalette } from "../config/brand.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

let pass = 0;
let fail = 0;
function assert(cond, msg) {
  if (cond) {
    pass += 1;
    console.log(`  PASS  ${msg}`);
  } else {
    fail += 1;
    console.log(`  FAIL  ${msg}`);
  }
}

console.log("\nVisual Contract — Sprint 25.5.1\n");

const matrix = [
  ["Splash escuro premium", "components/brand/premium-global-loader.tsx", "brand-navy"],
  ["Login institucional", "components/auth/auth-brand-panel.tsx", "positioning"],
  ["Header premium", "components/layout/app-header.tsx", "data-app-header-premium"],
  ["Sidebar premium", "components/layout/app-sidebar.tsx", "data-app-sidebar-premium"],
  ["Dashboard glow", "components/dashboard/executive/executive-dashboard-shell.tsx", "data-dashboard-premium"],
  [
    "Dashboard premium v251",
    "components/dashboard/premium/premium-dashboard-view.tsx",
    "data-dashboard-premium-v251",
  ],
  ["KPI strip", "components/dashboard/premium/premium-kpi-strip.tsx", "data-premium-block"],
  ["Main row", "components/dashboard/premium/premium-main-row.tsx", "Central de Inteligência"],
  ["Landing header", "components/layout/marketing-header.tsx", "data-landing-header"],
  ["Landing hero", "components/marketing/hero-section.tsx", "data-landing-block"],
  ["Landing shell", "app/(marketing)/layout.tsx", "data-landing-shell"],
  ["Tema", "components/brand/theme-provider.tsx", "brandStorageKeys"],
];

for (const [label, file, needle] of matrix) {
  const abs = join(root, file);
  assert(existsSync(abs), `${label} arquivo`);
  const src = readFileSync(abs, "utf8");
  assert(src.includes(needle), `${label} contrato`);
}

assert(brandPalette.gold && brandPalette.navy && brandPalette.silver, "tríade marca");
assert(!/Inter.*Roboto.*Arial/.test(brandConfig.name), "não stack genérico no nome");

const layout = readFileSync(join(root, "app/layout.tsx"), "utf8");
assert(layout.includes("themeBootScript") || layout.includes("gof-theme"), "boot tema");
assert(layout.includes("icon-512") || layout.includes("icon512"), "icons metadata");

const markComp = readFileSync(
  join(root, "components/brand/brand-mark.tsx"),
  "utf8",
);
assert(
  markComp.includes("icon-64") || markComp.includes("markPng"),
  "sem G genérico de texto",
);

const stream = readFileSync(
  join(root, "components/dashboard/dashboard-streaming.tsx"),
  "utf8",
);
assert(stream.includes("PremiumDashboardView"), "stream wired to premium view");
assert(
  readFileSync(join(root, "components/dashboard/premium/premium-dashboard-view.tsx"), "utf8").includes(
    "data-dashboard-premium-v256",
  ),
  "dashboard polish 25.6",
);

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
