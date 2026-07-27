#!/usr/bin/env node
/**
 * Sprint 21.6 RC6 — Gate de validação live (Supabase REST / service_role).
 * Espelha os scripts SQL RC5 quando não há DATABASE_URL / psql.
 * Uso: node --env-file=.env.local scripts/enterprise-rc6-gate.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ENTERPRISE_TABLES = [
  "audit_events",
  "workflow_definitions",
  "workflow_instances",
  "workflow_history",
  "workflow_pending_actions",
  "approval_definitions",
  "approval_requests",
  "approval_decisions",
  "approval_history",
  "approval_pending_actions",
  "notifications",
  "notification_recipients",
  "notification_delivery_attempts",
  "notification_preferences",
  "notification_templates",
  "tenant_roles",
  "tenant_rbac_role_permissions",
  "tenant_user_roles",
  "tenant_user_permission_overrides",
  "enterprise_outbox",
  "enterprise_idempotency_keys",
];

const SERVER_RPCS = [
  "enterprise_claim_outbox_batch",
  "enterprise_complete_outbox_event",
  "enterprise_fail_outbox_event",
  "enterprise_release_outbox_locks",
  "enterprise_resolve_idempotency",
];

const MEMBER_RPCS = [
  "enterprise_save_workflow_definition",
  "enterprise_save_approval_definition",
  "enterprise_save_notification_template",
  "enterprise_commit_approval_decision",
];

const phases = [];
const audit = { FOUND: [], MISSING: [], WARNING: [], INVALID: [] };

function loadEnv() {
  const env = { ...process.env };
  const path = resolve(process.cwd(), ".env.local");
  if (existsSync(path)) {
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
  return env;
}

function classify(verdict, item, detail = "") {
  audit[verdict]?.push({ item, detail });
}

function phase(name, status, detail = "") {
  phases.push({ name, status, detail });
  const mark =
    status === "PASS" ? "PASS" : status === "WARNING" ? "WARN" : "FAIL";
  console.log(`[${mark}] ${name}${detail ? ` — ${detail}` : ""}`);
}

function isMissingTable(error) {
  if (!error) return false;
  const msg = `${error.message ?? ""} ${error.code ?? ""} ${error.details ?? ""}`;
  return /does not exist|Could not find the table|PGRST205|42P01/i.test(msg);
}

function isPermissionDenied(error) {
  if (!error) return false;
  const blob = `${error.message ?? ""} ${error.code ?? ""}`;
  return /permission denied|42501|not authorized|insufficient privilege|PGRST202/i.test(
    blob,
  );
}

function isRpcServerProtected(error) {
  if (!error) return false;
  const blob = `${error.message ?? ""} ${error.code ?? ""}`;
  if (/permission denied|42501|not authorized|insufficient privilege|PGRST202/i.test(blob)) {
    return true;
  }
  return false;
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = env.SUPABASE_SERVICE_ROLE_KEY;

console.log("\n═══ Sprint 21.6 RC6 — Enterprise Gate (live) ═══\n");

if (!url || !service || !anon) {
  phase("FASE 0 — Env Supabase", "FAIL", "URL/anon/service_role ausentes");
  console.log(JSON.stringify({ phases, audit }, null, 2));
  process.exit(1);
}

const admin = createClient(url, service, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const anonSb = createClient(url, anon, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ── FASE 1.1 — readonly audit (tabelas) ─────────────────────────────────────
let missingTables = 0;
for (const table of ENTERPRISE_TABLES) {
  const { error } = await admin.from(table).select("id", {
    head: true,
    count: "exact",
  });
  if (isMissingTable(error)) {
    missingTables += 1;
    classify("MISSING", `table:${table}`, error.message);
  } else if (error) {
    classify("WARNING", `table:${table}`, error.message);
  } else {
    classify("FOUND", `table:${table}`);
  }
}

phase(
  "1.1 readonly_audit.sql — tabelas Enterprise",
  missingTables === 0 ? "PASS" : "FAIL",
  `${ENTERPRISE_TABLES.length - missingTables}/${ENTERPRISE_TABLES.length} FOUND`,
);

// legacy RBAC
{
  const { error } = await admin
    .from("tenant_role_permissions")
    .select("role, permission_key", { head: true, count: "exact" });
  if (!isMissingTable(error)) {
    const { data, error: colErr } = await admin
      .from("tenant_role_permissions")
      .select("role_id")
      .limit(1);
    if (!colErr && data !== null) {
      classify("INVALID", "legacy:tenant_role_permissions.role_id", "coluna existe");
    } else {
      classify("FOUND", "legacy:tenant_role_permissions (text role)");
    }
  }
}

// ── FASE 1.2 — RLS auth test (limitado via REST) ────────────────────────────
{
  const { data: pair } = await admin
    .from("tenant_members")
    .select("user_id, tenant_id")
    .limit(50);

  const tm = pair ?? [];
  let userA = null;
  let tenantA = null;
  let tenantB = null;

  if (tm.length > 0) {
    userA = tm[0].user_id;
    tenantA = tm[0].tenant_id;
    const { data: otherTenant } = await admin
      .from("tenants")
      .select("id")
      .neq("id", tenantA)
      .limit(1)
      .maybeSingle();
    tenantB = otherTenant?.id ?? null;
  }

  if (!tenantB) {
    phase(
      "1.2 auth_rls_test.sql — tenant A/B",
      "WARNING",
      "sem par tenant_members distinto — executar SQL Editor",
    );
  } else {
    const { count: crossAsAdmin } = await admin
      .from("audit_events")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantB);
    phase(
      "1.2 auth_rls_test.sql — descoberta tenant A/B",
      "PASS",
      `tenantA=${tenantA?.slice(0, 8)}… tenantB=${tenantB?.slice(0, 8)}…`,
    );

    const { data: anonRows, error: anonErr } = await anonSb
      .from("audit_events")
      .select("id")
      .eq("tenant_id", tenantB)
      .limit(1);
    const anonBlocked =
      isPermissionDenied(anonErr) ||
      (anonRows?.length ?? 0) === 0;
    phase(
      "1.2 auth_rls_test.sql — anon sem JWT",
      anonBlocked ? "PASS" : "FAIL",
      anonErr?.message ?? `${anonRows?.length ?? 0} rows`,
    );

    phase(
      "1.2 auth_rls_test.sql — authenticated SET ROLE",
      "WARNING",
      "requer SQL Editor (SET LOCAL ROLE authenticated) — não reproduzível só via REST",
    );
  }
}

// ── FASE 1.3 — RPC grants RC5 ───────────────────────────────────────────────
let serverGrantFails = 0;
const probeTenant =
  (await admin.from("tenants").select("id").limit(1).maybeSingle()).data?.id ??
  "00000000-0000-0000-0000-000000000001";

for (const rpc of SERVER_RPCS) {
  const args =
    rpc === "enterprise_claim_outbox_batch"
      ? {
          p_tenant_id: probeTenant,
          p_processor_id: "rc6-gate",
          p_limit: 1,
          p_lock_ttl_seconds: 60,
        }
      : rpc === "enterprise_complete_outbox_event"
        ? {
            p_tenant_id: probeTenant,
            p_event_id: "00000000-0000-0000-0000-000000000001",
            p_processor_id: "rc6-gate",
          }
        : rpc === "enterprise_fail_outbox_event"
          ? {
              p_tenant_id: probeTenant,
              p_event_id: "00000000-0000-0000-0000-000000000001",
              p_processor_id: "rc6-gate",
              p_error: "rc6",
              p_retry: false,
            }
          : rpc === "enterprise_release_outbox_locks"
            ? { p_tenant_id: probeTenant, p_lock_ttl_seconds: 60 }
            : {
                p_tenant_id: probeTenant,
                p_idempotency_key: "rc6-probe",
                p_operation: "rc6.op",
                p_request_hash: "hash",
                p_response_snapshot: null,
                p_ttl_minutes: 60,
              };

  const { error: anonRpcErr } = await anonSb.rpc(rpc, args);
  const anonDenied = isRpcServerProtected(anonRpcErr);
  if (!anonDenied) serverGrantFails += 1;

  const { error: adminRpcErr } = await admin.rpc(rpc, args);
  const adminCallable = !isPermissionDenied(adminRpcErr);
  if (anonDenied && adminCallable) {
    classify("FOUND", `rpc_grant_server:${rpc}`);
  } else if (!anonDenied) {
    classify("INVALID", `rpc_grant_server:${rpc}`, "anon/authenticated ainda pode EXECUTE");
  } else {
    classify("WARNING", `rpc_grant_server:${rpc}`, adminRpcErr?.message ?? "service_role?");
  }
}

phase(
  "1.3 rpc_grants_rc5.sql",
  serverGrantFails === 0 ? "PASS" : "FAIL",
  `${SERVER_RPCS.length - serverGrantFails}/${SERVER_RPCS.length} server-only (anon denied)`,
);

// member RPCs — anon must be denied, existence check via admin
for (const rpc of MEMBER_RPCS) {
  const { error: anonErr } = await anonSb.rpc(rpc, {
    p_tenant_id: probeTenant,
  });
  if (isPermissionDenied(anonErr)) {
    classify("FOUND", `rpc_grant_member:${rpc}`);
  } else {
    classify("INVALID", `rpc_grant_member:${rpc}`, "anon não revogado");
  }
}

// ── FASE 1.4 — staging smoke (read-only + estrutura) ────────────────────────
{
  const { error: wfErr } = await admin
    .from("workflow_definitions")
    .select("id, tenant_id, workflow_key, version")
    .is("tenant_id", null)
    .limit(1);
  phase(
    "1.4 staging_smoke.sql — definitions globais legíveis",
    wfErr ? "WARNING" : "PASS",
    wfErr?.message ?? "ok",
  );

  phase(
    "1.4 staging_smoke.sql — DML transacional BEGIN/ROLLBACK",
    "WARNING",
    "executar SQL Editor — REST não suporta ROLLBACK atómico",
  );
}

// ── FASE 1.5 — residue check ────────────────────────────────────────────────
const residueQueries = [
  {
    name: "audit",
    run: () =>
      admin
        .from("audit_events")
        .select("id", { count: "exact", head: true })
        .or(
          "event.like.RC%_SMOKE%,system_actor_key.like.rc%-%,system_actor_key.in.(rc4-smoke-system,rc5-smoke-system,rc5-integration,rc5-service,bad-key,bad)",
        ),
  },
  {
    name: "workflow",
    run: () =>
      admin
        .from("workflow_definitions")
        .select("id", { count: "exact", head: true })
        .like("workflow_key", "rc%-%"),
  },
  {
    name: "outbox",
    run: () =>
      admin
        .from("enterprise_outbox")
        .select("id", { count: "exact", head: true })
        .in("event_type", ["RC4_SMOKE", "RC5_SMOKE"]),
  },
  {
    name: "idempotency",
    run: () =>
      admin
        .from("enterprise_idempotency_keys")
        .select("id", { count: "exact", head: true })
        .like("idempotency_key", "rc%-%"),
  },
];

let residueTotal = 0;
for (const q of residueQueries) {
  const { count, error } = await q.run();
  const n = error ? -1 : (count ?? 0);
  if (n > 0) residueTotal += n;
  if (n === 0) classify("FOUND", `residue:${q.name}`, "0");
  else if (n < 0) classify("WARNING", `residue:${q.name}`, error?.message);
  else classify("INVALID", `residue:${q.name}`, `${n} rows`);
}

phase(
  "1.5 residue_check.sql",
  residueTotal === 0 ? "PASS" : "FAIL",
  `${residueTotal} resíduos detectados`,
);

// ── FASE 5 — Types (estático) ───────────────────────────────────────────────
const dbTs = readFileSync(resolve("types/database.ts"), "utf8");
const hasEnterpriseTables = /audit_events:\s*\{/.test(dbTs);
const hasEnterpriseRpc = /enterprise_claim_outbox_batch:/.test(dbTs);
const facade = readFileSync(resolve("types/database-enterprise.ts"), "utf8");
const pendingRegen = /ENTERPRISE_TYPES_PENDING_REGEN\s*=\s*true/.test(facade);
const hasTempAlias = existsSync(resolve("types/enterprise-database.ts"));

phase(
  "FASE 5 — types/database.ts Tables Enterprise",
  hasEnterpriseTables ? "PASS" : "FAIL",
  hasEnterpriseTables ? "FOUND" : "MISSING",
);
phase(
  "FASE 5 — types/database.ts RPCs",
  hasEnterpriseRpc ? "PASS" : "FAIL",
  hasEnterpriseRpc ? "FOUND" : "MISSING",
);
phase(
  "FASE 5 — aliases temporários",
  !pendingRegen && !hasTempAlias ? "PASS" : "WARNING",
  pendingRegen
    ? "ENTERPRISE_TYPES_PENDING_REGEN=true"
    : hasTempAlias
      ? "enterprise-database.ts ainda presente"
      : "aliases removidos",
);

console.log("\n─── Sumário audit ───");
for (const k of ["FOUND", "MISSING", "WARNING", "INVALID"]) {
  console.log(`  ${k}: ${audit[k].length}`);
}

const fails = phases.filter((p) => p.status === "FAIL").length;
const warns = phases.filter((p) => p.status === "WARNING").length;
console.log(`\nFases: ${phases.length} | FAIL: ${fails} | WARNING: ${warns}\n`);

process.exit(fails > 0 ? 1 : 0);
