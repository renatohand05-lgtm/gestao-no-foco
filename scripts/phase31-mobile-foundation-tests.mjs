#!/usr/bin/env node
/**
 * Phase 31.0 — Mobile foundation structure and docs.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
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

function resolveDoc(name) {
  const candidates = [
    join(root, "docs", name),
    join(root, "docs/architecture", name),
    join(root, "docs/security", name),
  ];
  return candidates.find((p) => existsSync(p)) ?? candidates[0];
}

console.log("\nPhase 31.0 — mobile foundation\n");

const mobileRoot = join(root, "apps/mobile");
check("apps/mobile existe", existsSync(mobileRoot));

const mobilePkg = JSON.parse(
  readFileSync(join(mobileRoot, "package.json"), "utf8"),
);
check("expo-router entry (main)", mobilePkg.main === "expo-router/entry");

for (const f of ["app.config.ts", "eas.json", ".env.example"]) {
  check(`apps/mobile/${f}`, existsSync(join(mobileRoot, f)));
}

for (const pkg of [
  "design-tokens",
  "domain",
  "schemas",
  "api-contracts",
  "rbac-contracts",
  "config",
  "utils",
]) {
  check(`packages/${pkg}`, existsSync(join(root, "packages", pkg, "package.json")));
}

for (const doc of [
  "PHASE_31_0_MOBILE_FOUNDATION.md",
  "MOBILE_MONOREPO_DECISION.md",
  "MOBILE_SHARED_PACKAGES.md",
  "MOBILE_AUTH.md",
  "MOBILE_OFFLINE_FOUNDATION.md",
  "MOBILE_PUSH_FOUNDATION.md",
  "MOBILE_THREAT_MODEL.md",
]) {
  const path = resolveDoc(doc);
  check(`doc ${doc}`, existsSync(path));
}

const rootPkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
for (const script of ["mobile:start", "mobile:typecheck", "mobile:doctor"]) {
  check(`root script ${script}`, typeof rootPkg.scripts?.[script] === "string");
}

const domainSrc = readFileSync(join(root, "packages/domain/src/index.ts"), "utf8");
check("FUTURE_MODULE_CARDS in domain", /export const FUTURE_MODULE_CARDS/.test(domainSrc));

const homeSrc = readFileSync(join(mobileRoot, "app/(app)/index.tsx"), "utf8");
check("home sem R$ inventado", !/R\$/.test(homeSrc));
check(
  "home sem faturamento inventado",
  !/faturamento/i.test(homeSrc) || /sem métricas inventadas/i.test(homeSrc),
);

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
