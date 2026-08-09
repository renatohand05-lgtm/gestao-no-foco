#!/usr/bin/env node
/**
 * Sprint 32.2 — Observabilidade, taxonomia, CRM empty≠error, correlation.
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

console.log("\nPhase 32.2 — pilot observability / quality\n");

const tel = readFileSync(
  join(root, "apps/mobile/src/observability/telemetry.ts"),
  "utf8",
);
for (const ev of [
  "APP_STARTED",
  "LOGIN_SUCCESS",
  "API_FAILED",
  "SESSION_RESTORED",
  "UNHANDLED_ERROR",
  "OFFLINE_ENTERED",
  "BIOMETRIC_SUCCESS",
]) {
  check(`telemetry event ${ev}`, tel.includes(`"${ev}"`));
}
check("telemetry não menciona password/token raw dump", !/access_token\s*:/.test(tel));

const tax = readFileSync(join(root, "apps/mobile/src/errors/taxonomy.ts"), "utf8");
for (const c of [
  "NETWORK_ERROR",
  "SESSION_EXPIRED",
  "PERMISSION_DENIED",
  "API_ERROR",
]) {
  check(`error category ${c}`, tax.includes(c));
}
check(
  "mensagem SESSION_EXPIRED clara",
  tax.includes("Sua sessão expirou"),
);
check(
  "mensagem NETWORK_ERROR clara",
  tax.includes("Verifique sua internet"),
);

const client = readFileSync(join(root, "apps/mobile/src/api/client.ts"), "utf8");
check("client envia x-gof-request-id / API_HEADERS.requestId", /requestId/.test(client));
check("client emite API_FAILED", client.includes('track("API_FAILED"'));

const resp = readFileSync(join(root, "lib/mobile/response.ts"), "utf8");
check("API echo requestId", resp.includes("readMobileRequestId"));

const crm = readFileSync(join(root, "lib/mobile/crm-compose.ts"), "utf8");
check(
  "CRM pipeline-vazio só se carga OK",
  crm.includes("!oportunidadesLoadFailed && abertas.length === 0"),
);
check(
  "CRM KPIs null quando oportunidades falham",
  crm.includes("oportunidadesLoadFailed ? null"),
);
check(
  "CRM follow_ups unavailable",
  crm.includes('unavailable.push("follow_ups")'),
);

const utils = readFileSync(join(root, "packages/utils/src/index.ts"), "utf8");
check("sanitizeForLog cobre email/cpf/token", /email|cpf|token/i.test(utils));

const config = readFileSync(join(root, "apps/mobile/app.config.ts"), "utf8");
check(
  "runtimeVersion isolado + integrity definida",
  /RUNTIME_VERSION\s*=\s*"1\.10\.0-/.test(config) &&
    /STARTUP_INTEGRITY\s*=\s*"[^"]+"/.test(config),
);

for (const f of [
  "docs/testing/evidence/32-2/BASELINE.md",
  "docs/testing/evidence/32-2/DATA_QUALITY.md",
  "docs/testing/evidence/32-2/SECURITY.md",
  "docs/pilot/PILOT_01.md",
  "docs/pilot/PILOT_01_CHECKLIST.md",
  "docs/pilot/RELEASE_PROCESS.md",
]) {
  check(`doc ${f}`, existsSync(join(root, f)));
}

console.log(`\nResultado: ${pass} PASS / ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
