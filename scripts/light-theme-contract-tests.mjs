#!/usr/bin/env node
/** Sprint 25.6 — Light theme contract */
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

console.log("\nLight Theme Contract — Sprint 25.6\n");

const globals = readFileSync(join(root, "app/globals.css"), "utf8");
assert(
  globals.includes("--background: #f0f2f6") ||
    globals.includes("--background: #eef1f5"),
  "fundo claro frio (26.1)",
);
assert(!globals.includes("#ebe6df"), "sem marfim");
assert(globals.includes("--primary: #c9a84c"), "dourado no claro");
assert(globals.includes("--sidebar: #f7f8fa"), "sidebar clara");
assert(!globals.includes("--background: #f4f1ea"), "evita cream genérico");
assert(globals.includes("--premium-glow"), "glow token");

const theme = readFileSync(join(root, "components/brand/theme-provider.tsx"), "utf8");
assert(theme.includes("light"), "suporte light");
assert(theme.includes("dark"), "suporte dark");

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
