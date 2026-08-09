#!/usr/bin/env node
/**
 * Phase 31.11.9 — Post-login / API base / session-preserving recovery.
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

console.log("\nPhase 31.11.9 — post-login API base\n");

const apiBaseSrc = readFileSync(join(mobileRoot, "src/env/api-base.ts"), "utf8");
check(
  "detects supabase host for API base",
  /API_BASE_IS_SUPABASE|isSupabaseHost/.test(apiBaseSrc),
);
check(
  "official origin is gestao-no-foco.vercel.app",
  /gestao-no-foco\.vercel\.app/.test(apiBaseSrc),
);

const clientSrc = readFileSync(join(mobileRoot, "src/api/client.ts"), "utf8");
check("api client uses getApiBaseUrl", /getApiBaseUrl/.test(clientSrc));
check("api client logs apiBaseCode", /apiBaseCode/.test(clientSrc));

const mobileApiSrc = readFileSync(join(mobileRoot, "src/api/mobile-api.ts"), "utf8");
check(
  "memberships hit api/mobile/v1",
  /api\/mobile\/v1\/memberships/.test(mobileApiSrc),
);

const tenantSrc = readFileSync(join(mobileRoot, "app/(auth)/tenant.tsx"), "utf8");
check("tenant preserves session on API error", /AuthenticatedDataError/.test(tenantSrc));
check("tenant has Sair da conta via recovery", /AuthenticatedDataError/.test(tenantSrc));
check("tenant no returnToLogin on error", !/returnToLogin\(/.test(tenantSrc));

const dashSrc = readFileSync(join(mobileRoot, "app/(app)/index.tsx"), "utf8");
check(
  "dashboard error uses AuthenticatedDataError",
  /AuthenticatedDataError|DASHBOARD_LOAD_FAILED/.test(dashSrc),
);

const envExample = readFileSync(join(mobileRoot, ".env.example"), "utf8");
check(
  ".env.example API base is Vercel not Supabase",
  /gestao-no-foco\.vercel\.app/.test(envExample) &&
    !/EXPO_PUBLIC_API_BASE_URL=https:\/\/.*supabase/.test(envExample),
);

check(
  "unit tests exist",
  existsSync(join(mobileRoot, "test/post-login-api-base.test.mjs")),
);

const bioSrc = readFileSync(join(mobileRoot, "src/auth/biometrics.ts"), "utf8");
check("Face ID still LocalAuthentication", /LocalAuthentication/.test(bioSrc));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
