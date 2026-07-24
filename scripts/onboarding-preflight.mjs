/**
 * Gate 19.4 — Onboarding premium preflight (offline).
 * Uso: npm run test:onboarding
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd());

const requiredFiles = [
  "lib/onboarding/premium-flow.ts",
  "lib/onboarding/onboarding-steps.ts",
  "lib/onboarding/onboarding-checklist.ts",
  "lib/onboarding/actions.ts",
  "components/onboarding/onboarding-wizard.tsx",
  "components/onboarding/onboarding-tour.tsx",
  "components/onboarding/onboarding-shell.tsx",
  "components/onboarding/onboarding-resume-card.tsx",
  "components/onboarding/implantation-checklist.tsx",
  "components/onboarding/dashboard-onboarding-lead.tsx",
  "app/(app)/[tenant]/primeiro-acesso/page.tsx",
];

let pass = 0;
let fail = 0;

function ok(msg) {
  pass += 1;
  console.log(`  OK  ${msg}`);
}

function bad(msg) {
  fail += 1;
  console.error(` FAIL ${msg}`);
}

console.log("Onboarding premium — preflight\n");

for (const rel of requiredFiles) {
  if (existsSync(resolve(root, rel))) ok(rel);
  else bad(`missing: ${rel}`);
}

const premium = readFileSync(
  resolve(root, "lib/onboarding/premium-flow.ts"),
  "utf8",
);
if (premium.includes("PREMIUM_ONBOARDING_FLOW")) ok("PREMIUM_ONBOARDING_FLOW export");
else bad("missing PREMIUM_ONBOARDING_FLOW");

const flowMatch = premium.match(
  /PREMIUM_ONBOARDING_FLOW[^=]*=\s*\[([\s\S]*?)\]\s*as const/,
);
if (flowMatch) {
  const ids = [...flowMatch[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  if (ids.length <= 4) ok(`premium flow length ${ids.length} (<=4)`);
  else bad(`premium flow too long: ${ids.length}`);
  for (const id of ["welcome", "company", "bank_account", "first_sale"]) {
    if (ids.includes(id)) ok(`premium step ${id}`);
    else bad(`missing premium step ${id}`);
  }
} else {
  bad("could not parse PREMIUM_ONBOARDING_FLOW");
}

const tour = readFileSync(
  resolve(root, "components/onboarding/onboarding-tour.tsx"),
  "utf8",
);
if (tour.includes("Ignorar")) ok("tour has Ignorar");
else bad("tour missing Ignorar");
if (tour.includes("IA Executiva")) ok("tour has IA Executiva");
else bad("tour missing IA Executiva");
if (!tour.includes("bg-blue-50")) ok("tour without legacy blue panel");
else bad("tour still uses legacy blue panel");

const wizard = readFileSync(
  resolve(root, "components/onboarding/onboarding-wizard.tsx"),
  "utf8",
);
if (wizard.includes("Pular")) ok("wizard always offers Pular");
else bad("wizard missing Pular");
if (wizard.includes("PREMIUM_ONBOARDING_FLOW")) ok("wizard uses premium flow");
else bad("wizard not using premium flow");
if (!wizard.includes("exAnimations") && !wizard.includes("exTypography"))
  ok("wizard without legacy ex*");
else bad("wizard still uses ex*");

const checklist = readFileSync(
  resolve(root, "components/onboarding/onboarding-checklist.tsx"),
  "utf8",
);
if (!checklist.includes("exAnimations") && !checklist.includes("exColors"))
  ok("checklist without legacy ex*");
else bad("checklist still uses ex*");
if (checklist.includes("gofCardSurface") || checklist.includes("gofTypography"))
  ok("checklist uses gof DS");
else bad("checklist missing gof DS");

console.log(`\nResult: ${pass} PASS · ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
