#!/usr/bin/env node
/** Sprint 26.4 — UX Premium */
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

console.log("\nEnterprise Refine 26.4 — UX Premium\n");
const launcher = readFileSync(
  join(root, "components/dashboard/dashboard-quick-actions.tsx"),
  "utf8",
);
assert(launcher.includes("data-launcher-shortcuts"), "shortcuts wired");
assert(launcher.includes("keydown"), "keydown listener");
assert(launcher.includes("isTypingTarget"), "ignora inputs");
assert(existsSync(join(root, "components/ui/feedback-suspense-fallback.tsx")), "feedback skeleton");
const fb = readFileSync(join(root, "components/estoque/estoque-feedback.tsx"), "utf8");
assert(fb.includes("FeedbackSuspenseFallback"), "estoque feedback fallback");
for (const mod of ["crm", "analytics", "estoque", "compras", "ordens", "clientes"]) {
  assert(
    existsSync(join(root, `app/(app)/[tenant]/${mod}/loading.tsx`)),
    `loading ${mod}`,
  );
}
const disc = readFileSync(
  join(root, "components/dashboard/premium/premium-disclosure.tsx"),
  "utf8",
);
assert(disc.includes("border-border"), "disclosure border sólida");
assert(disc.includes("gf-motion-micro"), "disclosure motion token");
console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
