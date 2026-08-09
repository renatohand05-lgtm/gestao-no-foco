#!/usr/bin/env node
/**
 * Phase 31.11.7 — Auth recovery / biometric loop fix (static + policy contracts).
 */
import { readFileSync, existsSync } from "node:fs";
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

console.log("\nPhase 31.11.7 — mobile auth recovery\n");

const resetSrc = readFileSync(
  join(mobileRoot, "src/auth/reset-local-auth.ts"),
  "utf8",
);
check("resetLocalMobileAuth exists", /export async function resetLocalMobileAuth/.test(resetSrc));
check(
  "reset clears SecureStore session keys via clearSecureSession",
  /clearSecureSession/.test(resetSrc),
);
check(
  "reset deletes supabase auth storage key",
  /clearSupabaseAuthStorage|SUPABASE_AUTH_STORAGE_KEY|gof\.supabase\.auth/.test(resetSrc),
);
check("reset is idempotent (in-flight promise)", /resetInFlight/.test(resetSrc));
check("reset does not mention SERVICE_ROLE", !/SERVICE_ROLE/i.test(resetSrc));

const secureSrc = readFileSync(
  join(mobileRoot, "src/auth/secure-session.ts"),
  "utf8",
);
check("SECURE_SESSION_KEYS exported", /export const SECURE_SESSION_KEYS/.test(secureSrc));
for (const key of [
  "gof.access_token",
  "gof.refresh_token",
  "gof.biometric_enabled",
  "gof.user_id",
]) {
  check(`key present: ${key}`, secureSrc.includes(`"${key}"`));
}

const layoutSrc = readFileSync(join(mobileRoot, "app/_layout.tsx"), "utf8");
check(
  "biometric fail calls returnToLogin (clears session)",
  /returnToLogin/.test(layoutSrc) && /biometric_/.test(layoutSrc),
);
check(
  "biometric gate uses single attempt consumer",
  /consumeBiometricUnlockAttempt/.test(layoutSrc),
);
check(
  "biometric fail does not only router.replace without reset",
  !/if\s*\(\s*!result\.ok\s*\)\s*\{\s*router\.replace\(resolveBootRoute\("unauthenticated"\)\)\s*\}/.test(
    layoutSrc,
  ),
);

const offlineSrc = readFileSync(join(mobileRoot, "app/offline.tsx"), "utf8");
check(
  "offline has Voltar para o login",
  /Voltar para o login/.test(offlineSrc),
);
check(
  "offline has Tentar novamente",
  /Tentar novamente/.test(offlineSrc),
);
check("offline calls returnToLogin", /returnToLogin/.test(offlineSrc));

const tenantSrc = readFileSync(
  join(mobileRoot, "app/(auth)/tenant.tsx"),
  "utf8",
);
check(
  "tenant does not hardcode network_unavailable for all errors",
  !/message=\{authErrorFromCode\("network_unavailable"\)\.message\}/.test(tenantSrc),
);
check(
  "tenant uses AuthenticatedDataError (preserva sessão)",
  /AuthenticatedDataError/.test(tenantSrc),
);
check(
  "tenant does not auto returnToLogin on load error",
  !/returnToLogin\(/.test(tenantSrc),
);

const sessionSrc = readFileSync(
  join(mobileRoot, "src/auth/session-store.ts"),
  "utf8",
);
check("session-store exports returnToLogin", /returnToLogin\s*:/.test(sessionSrc));
check(
  "logout uses resetLocalMobileAuth",
  /logout[\s\S]*resetLocalMobileAuth/.test(sessionSrc),
);
check(
  "refresh failure online uses classifyRestoreFailure",
  /classifyRestoreFailure/.test(sessionSrc),
);
check("boot supports manual mode", /mode\?\s*:\s*"auto"\s*\|\s*"manual"/.test(sessionSrc) || /mode \?\? "auto"/.test(sessionSrc));

const policySrc = readFileSync(
  join(mobileRoot, "src/auth/recovery-policy.ts"),
  "utf8",
);
check(
  "policy separates network from local_credential_invalid",
  /local_credential_invalid/.test(policySrc) && /network/.test(policySrc),
);

const indexSrc = readFileSync(join(mobileRoot, "app/index.tsx"), "utf8");
check(
  "index shows bootstrap error recovery UI",
  /BootstrapErrorActions/.test(indexSrc),
);

check(
  "unit test file exists",
  existsSync(join(mobileRoot, "test/auth-recovery.test.mjs")),
);

const loginSrc = readFileSync(join(mobileRoot, "app/(auth)/login.tsx"), "utf8");
check("login by password preserved (signIn path via store)", /s\.login/.test(loginSrc));

const bioSrc = readFileSync(join(mobileRoot, "src/auth/biometrics.ts"), "utf8");
check(
  "Face ID still LocalAuthentication unlock",
  /authenticateAsync/.test(bioSrc) && /LocalAuthentication/.test(bioSrc),
);

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
