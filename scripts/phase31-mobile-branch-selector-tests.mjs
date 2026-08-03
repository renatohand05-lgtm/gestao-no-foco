#!/usr/bin/env node
/**
 * Phase 31.1 — Mobile branch selector (allowContinueWithoutBranch + CTA).
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const mobileRoot = join(root, "apps/mobile");
let pass = 0;
let fail = 0;

function check(name, cond) {
  if (cond) {
    pass += 1;
    console.log("  PASS", name);
  } else {
    fail += 1;
    console.log("  FAIL", name);
  }
}

console.log("\nPhase 31.1 — mobile branch selector\n");

const branchRouteSrc = readFileSync(
  join(root, "app/api/mobile/v1/tenants/[tenantId]/branches/route.ts"),
  "utf8",
);
check(
  "branches API returns allowContinueWithoutBranch",
  /allowContinueWithoutBranch/.test(branchRouteSrc),
);

const branchSrc = readFileSync(join(mobileRoot, "app/(auth)/branch.tsx"), "utf8");
check(
  "branch.tsx handles allowContinueWithoutBranch",
  /allowContinueWithoutBranch/.test(branchSrc),
);
check(
  "branch.tsx continue without branch CTA",
  /Continuar sem filial/.test(branchSrc),
);
check(
  "branch.tsx calls continueWithoutBranch",
  /continueWithoutBranch/.test(branchSrc),
);
check(
  "branch.tsx calls markContinueWithoutBranch",
  /markContinueWithoutBranch/.test(branchSrc),
);

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
