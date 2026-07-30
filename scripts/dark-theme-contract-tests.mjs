#!/usr/bin/env node
/** Sprint 25.6 — Dark theme contract (sem brand-white hardcoded em dashboard) */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0;
let fail = 0;
function assert(cond, msg) {
  if (cond) { pass++; console.log(`  PASS  ${msg}`); }
  else { fail++; console.log(`  FAIL  ${msg}`); }
}

const files = [
  "components/dashboard/executive/executive-intelligence-center.tsx",
  "components/dashboard/executive-command-center/executive-header.tsx",
  "components/dashboard/dashboard-quick-actions.tsx",
  "components/ai/executive-copilot/executive-copilot-panel.tsx",
];

console.log("\nDark Theme Contract — Sprint 25.6\n");

for (const f of files) {
  const src = readFileSync(join(root, f), "utf8");
  assert(!src.includes("bg-[var(--brand-white)]"), `${f} sem brand-white`);
  assert(
    src.includes("bg-card") ||
      src.includes("bg-background") ||
      src.includes("gofCardSurface") ||
      src.includes("ExecutiveCard") ||
      src.includes("--surface-raised") ||
      src.includes("--surface-base") ||
      src.includes("--surface-overlay"),
    `${f} usa token tema`,
  );
}

const globals = readFileSync(join(root, "app/globals.css"), "utf8");
assert(globals.includes(".dark {"), "bloco dark");
assert(globals.includes("--background: #0b0f14"), "navy dark");

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
