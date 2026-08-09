#!/usr/bin/env node
/**
 * Phase 31.1 — Mobile biometrics (opt-in LocalAuthentication + Face ID plist).
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

console.log("\nPhase 31.1 — mobile biometrics\n");

const bioSrc = readFileSync(join(mobileRoot, "src/auth/biometrics.ts"), "utf8");
check("biometrics uses LocalAuthentication", /LocalAuthentication/.test(bioSrc));
check(
  "biometrics authenticateAsync for unlock",
  /authenticateAsync/.test(bioSrc),
);
check(
  "biometrics checks pref before unlock",
  /loadBiometricPref|biometricEnabled/.test(bioSrc),
);

const setupSrc = readFileSync(join(mobileRoot, "app/(auth)/biometric-setup.tsx"), "utf8");
check("biometric-setup screen exists (opt-in flow)", /BiometricSetup|biometric-setup/.test(setupSrc) || /setBiometricPref/.test(setupSrc));
check(
  "biometric-setup offers skip / agora não",
  /Agora não|Continuar/.test(setupSrc),
);
check(
  "biometric-setup does not auto-enable on mount",
  !/useEffect[\s\S]{0,120}setBiometricPref\s*\(\s*true/.test(setupSrc),
);

const layoutSrc = readFileSync(join(mobileRoot, "app/_layout.tsx"), "utf8");
check(
  "_layout unlock only when biometric pref enabled",
  /loadBiometricPref[\s\S]*enabled/.test(layoutSrc),
);
check(
  "_layout biometric fail resets local auth (returnToLogin)",
  /returnToLogin/.test(layoutSrc),
);
check(
  "_layout single biometric attempt per boot",
  /consumeBiometricUnlockAttempt/.test(layoutSrc),
);

const appConfigSrc = readFileSync(join(mobileRoot, "app.config.ts"), "utf8");
check(
  "NSFaceIDUsageDescription in app.config",
  /NSFaceIDUsageDescription/.test(appConfigSrc),
);

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
