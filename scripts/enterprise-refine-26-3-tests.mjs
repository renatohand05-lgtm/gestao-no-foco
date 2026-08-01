#!/usr/bin/env node
/** Sprint 26.3 — Visual refinement (spacing, focus, skeleton, empty, motion) */
import { existsSync, readFileSync } from "node:fs";
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

console.log("\nEnterprise Refine 26.3 — Visual\n");
assert(existsSync(join(root, "components/gf/gf-empty-state.tsx")), "GFEmptyState");
assert(existsSync(join(root, "components/gf/gf-skeleton.tsx")), "GFSkeleton");
const css = readFileSync(join(root, "app/globals.css"), "utf8");
assert(css.includes(".gf-interactive"), "gf-interactive");
assert(css.includes("gf-skeleton-shimmer"), "skeleton shimmer");
assert(css.includes("prefers-reduced-motion"), "reduced motion");
assert(!css.includes("#ebe6df"), "sem marfim");
const tokens = readFileSync(join(root, "lib/design-system/tokens.ts"), "utf8");
assert(tokens.includes("ring-[var(--brand-gold)]/40"), "focus dourado");
assert(tokens.includes("gf-motion-micro"), "hover duration token");
const empty = readFileSync(join(root, "components/ui/empty-state.tsx"), "utf8");
assert(empty.includes("border-border"), "empty border real");
assert(empty.includes('data-sprint="26.3"'), "empty marker");
const idx = readFileSync(join(root, "components/gf/index.ts"), "utf8");
assert(idx.includes("GFEmptyState"), "barrel empty");
assert(idx.includes("GFSkeleton"), "barrel skeleton");
console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
