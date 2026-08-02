#!/usr/bin/env node
/**
 * Sprint 30.3 — fluxo enterprise de onboarding (offline).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  ENTERPRISE_AVG_MINUTES,
  ENTERPRISE_ONBOARDING_FLOW,
  enterpriseProgressPct,
  nextEnterpriseStep,
  prevEnterpriseStep,
} from "../config/onboarding/flow.ts";
import { COMPANY_FIELDS } from "../config/onboarding/company-fields.ts";
import { ENTERPRISE_SEGMENTS } from "../config/onboarding/segments.ts";

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

console.log("Phase 30.3 — onboarding\n");

check("fluxo tem 8 etapas", ENTERPRISE_ONBOARDING_FLOW.length === 8);
check(
  "welcome copy",
  ENTERPRISE_ONBOARDING_FLOW[0].description.includes(
    "configurar sua empresa em poucos minutos",
  ),
);
check("tempo médio definido", ENTERPRISE_AVG_MINUTES >= 5 && ENTERPRISE_AVG_MINUTES <= 10);
check("next welcome→segment", nextEnterpriseStep("welcome") === "segment");
check("prev segment→welcome", prevEnterpriseStep("segment") === "welcome");
check("progress complete 100%", enterpriseProgressPct("complete") === 100);
check("10 segmentos catalogados", ENTERPRISE_SEGMENTS.length === 10);
check(
  "campos empresa não obrigatórios",
  COMPANY_FIELDS.every((f) => f.required === false),
);

const required = [
  "components/onboarding/enterprise/enterprise-onboarding-wizard.tsx",
  "lib/onboarding/enterprise/actions.ts",
  "app/(app)/[tenant]/primeiro-acesso/page.tsx",
];
for (const rel of required) {
  check(`arquivo ${rel}`, existsSync(resolve(rel)));
}

const page = readFileSync(
  resolve("app/(app)/[tenant]/primeiro-acesso/page.tsx"),
  "utf8",
);
check(
  "primeiro-acesso usa EnterpriseOnboardingWizard",
  page.includes("EnterpriseOnboardingWizard"),
);

const wizard = readFileSync(
  resolve("components/onboarding/enterprise/enterprise-onboarding-wizard.tsx"),
  "utf8",
);
check("wizard tem Parabéns", /Parabéns!/.test(wizard));
check("wizard autosave localStorage", /localStorage/.test(wizard));
check("wizard ARIA progressbar", /role="progressbar"/.test(wizard));

// Gate 19.4 preservado
const premiumWizard = readFileSync(
  resolve("components/onboarding/onboarding-wizard.tsx"),
  "utf8",
);
check(
  "wizard premium Gate 19.4 intacto",
  premiumWizard.includes("PREMIUM_ONBOARDING_FLOW") &&
    premiumWizard.includes("Pular"),
);

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
