#!/usr/bin/env node
/**
 * Phase 31.0 — Mobile navigation routes (expo-router).
 */
import { existsSync, readFileSync } from "node:fs";
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

console.log("\nPhase 31.0 — mobile navigation\n");

const routes = [
  ["login", "app/(auth)/login.tsx"],
  ["tenant", "app/(auth)/tenant.tsx"],
  ["branch", "app/(auth)/branch.tsx"],
  ["app index", "app/(app)/index.tsx"],
  ["profile", "app/(app)/profile.tsx"],
  ["settings", "app/(app)/settings.tsx"],
  ["offline", "app/offline.tsx"],
  ["access-denied", "app/access-denied.tsx"],
  ["+not-found", "app/+not-found.tsx"],
];

for (const [label, rel] of routes) {
  check(`route ${label}`, existsSync(join(mobileRoot, rel)));
}

const mobilePkg = JSON.parse(
  readFileSync(join(mobileRoot, "package.json"), "utf8"),
);
check(
  "expo-router in dependencies",
  Boolean(mobilePkg.dependencies?.["expo-router"]),
);

const layoutSrc = readFileSync(join(mobileRoot, "app/_layout.tsx"), "utf8");
check("root layout uses Stack from expo-router", /from "expo-router"/.test(layoutSrc));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
