#!/usr/bin/env node
/**
 * Phase 31.11.8 — Boot crash safety / ErrorBoundary / SecureStore hardening.
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

console.log("\nPhase 31.11.8 — mobile boot safety\n");

const layoutSrc = readFileSync(join(mobileRoot, "app/_layout.tsx"), "utf8");
check("RootErrorBoundary mounted", /RootErrorBoundary/.test(layoutSrc));
check("boot has catch for unhandled", /boot_unhandled|boot\(\{ mode: "auto" \}\)[\s\S]*\.catch/.test(layoutSrc));
check("biometric gate try/catch", /biometric\.gate_failed|try \{[\s\S]*unlockApp/.test(layoutSrc));
check("biometricGateStarted set before await", /biometricGateStarted\.current = true/.test(layoutSrc));
check("navigation readiness checked", /useRootNavigationState|navigationReady/.test(layoutSrc));

check(
  "ErrorBoundary file exists",
  existsSync(join(mobileRoot, "src/bootstrap/RootErrorBoundary.tsx")),
);
const ebSrc = readFileSync(
  join(mobileRoot, "src/bootstrap/RootErrorBoundary.tsx"),
  "utf8",
);
check("ErrorBoundary copy: aplicativo encontrou um erro", /encontrou um erro/.test(ebSrc));
check("ErrorBoundary has Voltar para o login", /Voltar para o login/.test(ebSrc));
check("ErrorBoundary has Tentar novamente", /Tentar novamente/.test(ebSrc));

const secureSrc = readFileSync(join(mobileRoot, "src/storage/secure.ts"), "utf8");
check("safeSecureGet never throws (catch)", /safeSecureGet[\s\S]*catch/.test(secureSrc));
check("safeSecureSet never throws (catch)", /safeSecureSet[\s\S]*catch/.test(secureSrc));

const sessionSrc = readFileSync(
  join(mobileRoot, "src/auth/secure-session.ts"),
  "utf8",
);
check(
  "secure-session uses safe SecureStore wrappers",
  /safeSecureGet|safeSecureSet/.test(sessionSrc),
);

const supabaseSrc = readFileSync(
  join(mobileRoot, "src/supabase/client.ts"),
  "utf8",
);
check(
  "Supabase auth uses AsyncStorage (avoid SecureStore 2048 limit)",
  /AsyncStorage/.test(supabaseSrc),
);
check(
  "Supabase storage adapter catches errors",
  /storage_get_failed|storage_set_failed|\.catch/.test(supabaseSrc),
);

const envSrc = readFileSync(join(mobileRoot, "src/env/validate.ts"), "utf8");
check("env uses safeParse", /safeParse/.test(envSrc));
check("env normalizes /rest/v1", /rest\/v1|normalizePublicUrl/.test(envSrc));

const resetSrc = readFileSync(
  join(mobileRoot, "src/auth/reset-local-auth.ts"),
  "utf8",
);
check(
  "wipe tolerates partial failures",
  /wipe_secure_failed|wipe_supabase_storage_failed/.test(resetSrc),
);

const bioSrc = readFileSync(join(mobileRoot, "src/auth/biometrics.ts"), "utf8");
check("unlockApp catches native throws", /unlock_threw|catch \(err\)/.test(bioSrc));

check(
  "boot-safety unit tests exist",
  existsSync(join(mobileRoot, "test/boot-safety.test.mjs")),
);

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
