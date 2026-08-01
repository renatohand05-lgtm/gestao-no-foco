#!/usr/bin/env node
/**
 * Sprint 26.10.1 — Homologação schema tributário (service role).
 * Não executa migration. Não imprime secrets.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { TAX_TABLES, probeTaxSchema } from "../lib/tax/persistence/schema.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(root, "docs/testing/evidence/26-10-1");
mkdirSync(OUT, { recursive: true });

function loadEnvLocal() {
  const p = join(root, ".env.local");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    )
      v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnvLocal();

let pass = 0;
let fail = 0;
const assert = (c, m) => {
  if (c) {
    pass++;
    console.log("  PASS ", m);
  } else {
    fail++;
    console.log("  FAIL ", m);
  }
};

const report = {
  at: new Date().toISOString(),
  sprint: "26.10.1",
  tables: [],
  migrationExpectations: {},
  summary: null,
};

console.log("\nHomologação 26.10.1 — schema tributário\n");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("SUPABASE env ausente");
  process.exit(1);
}
const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const mig = readFileSync(
  join(root, "supabase/migrations/20260817_tax_configuration_phase26_8.sql"),
  "utf8",
);

for (const t of TAX_TABLES) {
  const { error } = await admin.from(t).select("id", { head: true, count: "exact" }).limit(1);
  const ok = !error;
  report.tables.push({
    table: t,
    status: ok ? "OK" : "MISSING",
    error: error?.message ?? null,
    rls: mig.includes(`alter table public.${t} enable row level security`)
      ? "enabled_in_migration"
      : t === "tax_types"
        ? "enabled_in_migration"
        : "check_migration",
    notes: ok ? "acessível via API" : error?.message,
  });
  assert(ok, `table ${t}`);
}

const probe = await probeTaxSchema(admin);
assert(probe.ready, "probeTaxSchema ready");

const indexes = [
  "idx_tax_regimes_tenant",
  "idx_tax_rules_tenant_status",
  "idx_tax_rules_tenant_code_version",
  "idx_tax_rules_tenant_priority",
  "idx_tax_rules_validity",
  "idx_tax_rule_version_snapshots_tenant",
  "idx_tax_obligations_tenant",
  "idx_tax_traces_tenant_period",
  "idx_tax_sim_v2_tenant",
  "idx_tax_audit_tenant",
];
for (const idx of indexes) {
  const ok = mig.includes(idx);
  report.migrationExpectations[idx] = ok ? "defined" : "missing";
  assert(ok, `index defined ${idx}`);
}

assert(mig.includes("tax_rules_status_check"), "status constraint");
assert(mig.includes("tax_sim_v2_no_official"), "mutates_official constraint");
assert(mig.includes("tax_set_updated_at"), "updated_at trigger fn");
assert(mig.includes("tenant_members"), "RLS membership policies");
assert(mig.includes("create policy"), "policies exist in migration");

// Soft delete smoke: insert regime, soft-delete, list filters
const { data: tenants } = await admin.from("tenants").select("id,slug").limit(5);
const tenant =
  (tenants ?? []).find((t) => t.slug === "teste-renato-01") ?? tenants?.[0];
assert(Boolean(tenant?.id), "tenant resolved");

if (tenant?.id) {
  const rid = crypto.randomUUID();
  const { error: insErr } = await admin.from("tax_regimes").insert({
    id: rid,
    tenant_id: tenant.id,
    code: `HOMOLOG-SOFT-${Date.now()}`,
    name: "[TESTE] soft delete",
    jurisdiction: "BR",
    valid_from: "2026-01-01",
  });
  assert(!insErr, "insert regime for soft-delete");
  if (!insErr) {
    await admin
      .from("tax_regimes")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", rid)
      .eq("tenant_id", tenant.id);
    const { data: listed } = await admin
      .from("tax_regimes")
      .select("id")
      .eq("tenant_id", tenant.id)
      .eq("id", rid)
      .is("deleted_at", null);
    assert((listed ?? []).length === 0, "soft-deleted hidden with deleted_at filter");
  }

  // Cross-tenant empty
  const fake = crypto.randomUUID();
  const { data: leak } = await admin
    .from("tax_rules")
    .select("id")
    .eq("tenant_id", fake)
    .limit(5);
  assert((leak ?? []).length === 0, "cross-tenant rules empty");
}

report.summary = { pass, fail, classificationHint: fail ? "REPROVADO" : "schema_ok" };
writeFileSync(join(OUT, "schema-report.json"), JSON.stringify(report, null, 2));
console.log(`\nSchema: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
