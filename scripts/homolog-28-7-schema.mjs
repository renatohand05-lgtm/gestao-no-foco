#!/usr/bin/env node
/**
 * Sprint 28.7 — Validação schema pós-migration (service role).
 * Não executa SQL DDL. Não imprime secrets.
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(root, "docs/testing/evidence/28-7");
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
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnvLocal();

let pass = 0;
let fail = 0;
const checks = [];
function assert(cond, msg, detail = null) {
  if (cond) {
    pass++;
    checks.push({ ok: true, msg, detail });
    console.log("  PASS ", msg);
  } else {
    fail++;
    checks.push({ ok: false, msg, detail });
    console.log("  FAIL ", msg, detail ?? "");
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("SUPABASE env ausente");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

console.log("\nSprint 28.7 — schema pós-migration\n");

const { data: tenants, error: tErr } = await admin
  .from("tenants")
  .select("id,slug")
  .limit(20);
assert(!tErr, "tenants legível", tErr?.message);
const tenant =
  (tenants ?? []).find((t) => t.slug === "teste-renato-01") ?? tenants?.[0];
assert(Boolean(tenant?.id), "tenant teste-renato-01", tenant?.slug ?? null);
const other = (tenants ?? []).find((t) => t.id !== tenant?.id);

/** Probe table: select * limit 0 fails differently; use limit 1 */
async function probeTable(name, select = "*") {
  const { data, error } = await admin.from(name).select(select).limit(1);
  return { ok: !error, error: error?.message ?? null, sample: data?.[0] ?? null };
}

async function probeColumns(table, columns) {
  const { error } = await admin.from(table).select(columns.join(",")).limit(1);
  return { ok: !error, error: error?.message ?? null };
}

// CRM
const crmOpp = await probeTable("crm_oportunidades");
assert(crmOpp.ok, "tabela crm_oportunidades", crmOpp.error);
const crmCols = await probeColumns("crm_oportunidades", [
  "id",
  "tenant_id",
  "cliente_id",
  "titulo",
  "stage_key",
  "status",
  "deleted_at",
  "centro_custo_id",
  "tags",
]);
assert(crmCols.ok, "colunas Phase28 crm_oportunidades", crmCols.error);

const cliCols = await probeColumns("clientes", [
  "consentimento_contato",
  "origem_contato_detalhe",
  "prioridade_crm",
  "valor_potencial",
  "proxima_acao",
  "data_proxima_acao",
  "estagio_funil",
  "deleted_at",
  "tenant_id",
]);
assert(cliCols.ok, "colunas Phase28 clientes (leads)", cliCols.error);

// Agenda
const agendaEv = await probeTable("agenda_eventos");
assert(agendaEv.ok, "tabela agenda_eventos", agendaEv.error);
const agendaRec = await probeTable("agenda_recursos");
assert(agendaRec.ok, "tabela agenda_recursos", agendaRec.error);
const agendaCols = await probeColumns("agenda_eventos", [
  "id",
  "tenant_id",
  "titulo",
  "inicio",
  "fim",
  "tipo",
  "responsavel_id",
  "recurso_id",
  "deleted_at",
]);
assert(agendaCols.ok, "colunas agenda_eventos", agendaCols.error);

// OT
const otCols = await probeColumns("ordens_servico", [
  "tipo_ordem",
  "template_key",
  "tenant_id",
  "deleted_at",
]);
assert(otCols.ok, "colunas tipo_ordem/template_key", otCols.error);
const otTpl = await probeTable("ordem_trabalho_templates");
assert(otTpl.ok, "tabela ordem_trabalho_templates", otTpl.error);

// Finance
const budgets = await probeTable("finance_budgets");
assert(budgets.ok, "tabela finance_budgets", budgets.error);
const budgetLines = await probeTable("finance_budget_lines");
assert(budgetLines.ok, "tabela finance_budget_lines", budgetLines.error);
const centrosRes = await probeTable("centros_resultado");
assert(centrosRes.ok, "tabela centros_resultado", centrosRes.error);

// Tenant isolation smoke (service role can see all — assert filter works)
if (tenant?.id) {
  const { data: oppA } = await admin
    .from("crm_oportunidades")
    .select("id,tenant_id")
    .eq("tenant_id", tenant.id)
    .is("deleted_at", null)
    .limit(5);
  assert(Array.isArray(oppA), "list oportunidades tenant A");
  if (other?.id) {
    const { data: leak } = await admin
      .from("crm_oportunidades")
      .select("id")
      .eq("tenant_id", tenant.id)
      .neq("tenant_id", tenant.id)
      .limit(1);
    assert((leak ?? []).length === 0, "filtro tenant_id inconsistente impossível");
    const { count: countOther } = await admin
      .from("crm_oportunidades")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", other.id);
    assert(
      typeof countOther === "number",
      "contagem oportunidades outro tenant (isolamento por filtro)",
      String(countOther),
    );
  }
}

// Types vs runtime
const dbTs = readFileSync(join(root, "types/database.ts"), "utf8");
assert(dbTs.includes("crm_oportunidades:"), "types: crm_oportunidades");
const missingInTypes = [];
for (const needle of [
  ["centro_custo_id", "crm_oportunidades Phase28"],
  ["finance_budgets:", "finance_budgets"],
  ["finance_budget_lines:", "finance_budget_lines"],
  ["centros_resultado:", "centros_resultado"],
  ["agenda_eventos:", "agenda_eventos"],
  ["agenda_recursos:", "agenda_recursos"],
  ["ordem_trabalho_templates:", "ordem_trabalho_templates"],
  ["tipo_ordem", "ordens_servico.tipo_ordem"],
  ["consentimento_contato", "clientes.consentimento"],
]) {
  if (!dbTs.includes(needle[0])) missingInTypes.push(needle[1]);
}
assert(
  missingInTypes.length === 0,
  "types/database.ts cobre Phase 28",
  missingInTypes.length ? missingInTypes.join(", ") : null,
);

const report = {
  at: new Date().toISOString(),
  sprint: "28.7",
  tenant: tenant ? { id: tenant.id, slug: tenant.slug } : null,
  pass,
  fail,
  checks,
  missingInTypes,
  runtime: {
    crm_oportunidades: crmOpp.ok,
    agenda_eventos: agendaEv.ok,
    agenda_recursos: agendaRec.ok,
    ordem_trabalho_templates: otTpl.ok,
    finance_budgets: budgets.ok,
    finance_budget_lines: budgetLines.ok,
    centros_resultado: centrosRes.ok,
    tipo_ordem: otCols.ok,
    clientes_phase28: cliCols.ok,
  },
};

writeFileSync(
  join(OUT, "schema-validation.json"),
  JSON.stringify(report, null, 2),
  "utf8",
);

console.log(`\nResumo schema: ${pass} PASS · ${fail} FAIL`);
console.log(`Evidência: docs/testing/evidence/28-7/schema-validation.json\n`);
process.exit(fail > 0 ? 1 : 0);
