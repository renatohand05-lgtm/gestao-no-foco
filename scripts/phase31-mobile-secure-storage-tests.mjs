#!/usr/bin/env node
/**
 * Phase 31.0/31.1 — Mobile secure storage (SecureStore, version, biometrics).
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { sanitizeForLog } from "../packages/utils/src/index.ts";

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

console.log("\nPhase 31.0/31.1 — mobile secure storage\n");

const secureSessionSrc = readFileSync(
  join(mobileRoot, "src/auth/secure-session.ts"),
  "utf8",
);
check("secure-session uses SecureStore for tokens", /SecureStore|safeSecure/.test(secureSessionSrc));
check(
  "secure-session stores accessToken in SecureStore",
  /KEYS\.accessToken|accessToken.*SecureStore|safeSecureSet\(KEYS\.accessToken/.test(secureSessionSrc),
);
check(
  "secure-session does not use AsyncStorage",
  !/AsyncStorage/.test(secureSessionSrc),
);
check(
  "secure-session has storage version key",
  /storageVersion|STORAGE_VERSION/.test(secureSessionSrc),
);
check(
  "secure-session has biometric prefs key",
  /biometricEnabled/.test(secureSessionSrc),
);

const secureStorageSrc = readFileSync(
  join(mobileRoot, "src/storage/secure.ts"),
  "utf8",
);
check("storage/secure uses SecureStore", /SecureStore/.test(secureStorageSrc));
check(
  "storage/secure does not use AsyncStorage for tokens",
  !/AsyncStorage/.test(secureStorageSrc),
);

const utilsSrc = readFileSync(join(root, "packages/utils/src/index.ts"), "utf8");
check("sanitizeForLog redacts token keys", /token\|password\|secret/i.test(utilsSrc));

const redacted = sanitizeForLog({
  accessToken: "secret-token",
  refreshToken: "secret-refresh",
  email: "a@b.com",
});
check(
  "sanitizeForLog runtime redacts accessToken",
  redacted.accessToken === "[REDACTED]",
);
check(
  "sanitizeForLog runtime redacts refreshToken",
  redacted.refreshToken === "[REDACTED]",
);
check("sanitizeForLog keeps non-sensitive email", redacted.email === "a@b.com");

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
