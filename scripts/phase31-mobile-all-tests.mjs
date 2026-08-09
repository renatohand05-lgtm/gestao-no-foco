#!/usr/bin/env node
/** Aggregates all phase31-mobile-* suites. */
import { spawnSync } from "node:child_process";

const scripts = [
  "test:phase31-mobile-foundation",
  "test:phase31-mobile-auth-contracts",
  "test:phase31-mobile-auth",
  "test:phase31-mobile-session",
  "test:phase31-mobile-refresh",
  "test:phase31-mobile-tenant-isolation",
  "test:phase31-mobile-tenant-selector",
  "test:phase31-mobile-branch-selector",
  "test:phase31-mobile-rbac",
  "test:phase31-mobile-route-guards",
  "test:phase31-mobile-password-recovery",
  "test:phase31-mobile-deep-links",
  "test:phase31-mobile-biometrics",
  "test:phase31-mobile-auth-recovery",
  "test:phase31-mobile-boot-safety",
  "test:phase31-mobile-post-login",
  "test:phase31-mobile-offline-limited",
  "test:phase31-mobile-logout",
  "test:phase31-mobile-navigation",
  "test:phase31-mobile-design-system",
  "test:phase31-mobile-secure-storage",
  "test:phase31-mobile-api-client",
  "test:phase31-mobile-offline-contracts",
  "test:phase31-mobile-import-boundaries",
  "test:phase31-mobile-env",
];

let fail = 0;
for (const s of scripts) {
  console.log(`\n>>> ${s}`);
  const r = spawnSync("npm", ["run", s], { stdio: "inherit", shell: true });
  if (r.status !== 0) fail += 1;
}
console.log(fail === 0 ? "\nphase31-mobile ALL PASS" : `\nphase31-mobile FAIL (${fail})`);
process.exit(fail === 0 ? 0 : 1);
