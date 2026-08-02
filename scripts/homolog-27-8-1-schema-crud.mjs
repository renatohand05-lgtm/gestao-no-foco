#!/usr/bin/env node
/**
 * Sprint 27.8.1 — Homologação pós-migration: schema + CRUD serviço + constraints.
 * Não executa SQL. Não imprime secrets. Soft-delete do dado de teste ao final.
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  validateServiceImportRow,
  summarizeServiceImportValidation,
} from "../lib/produtos/service-import-validation.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(root, "docs/testing/evidence/27-8-1");
mkdirSync(OUT, { recursive: true });

const COLUMNS = [
  "tempo_estimado_minutos",
  "preco_sugerido",
  "especialidade",
  "equipe_ou_profissional",
  "unidade_cobranca",
];

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

const report = {
  at: new Date().toISOString(),
  sprint: "27.8.1",
  columns: COLUMNS,
  checks: [],
  serviceTestId: null,
  productCountBefore: null,
  productCountAfter: null,
  summary: null,
};

console.log("\nHomologação 27.8.1 — schema + CRUD serviços\n");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !serviceKey) {
  console.error("SUPABASE env ausente");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const mig = readFileSync(
  join(root, "supabase/migrations/20260801_sprint_27_8_service_fields.sql"),
  "utf8",
);
for (const col of COLUMNS) {
  assert(mig.includes(col), `migration defines ${col}`);
}
assert(
  mig.includes("produtos_tempo_estimado_minutos_nonneg"),
  "migration constraint tempo",
);
assert(
  mig.includes("produtos_preco_sugerido_nonneg"),
  "migration constraint preco_sugerido",
);

// 1) Leitura das colunas
const { data: probeRow, error: probeErr } = await admin
  .from("produtos")
  .select(COLUMNS.join(", "))
  .limit(1);
assert(!probeErr, "select novos campos", probeErr?.message ?? null);
assert(Array.isArray(probeRow), "select retornou array");

const { data: tenants } = await admin.from("tenants").select("id,slug").limit(10);
const tenant =
  (tenants ?? []).find((t) => t.slug === "teste-renato-01") ?? tenants?.[0];
assert(Boolean(tenant?.id), "tenant teste-renato-01 resolvido");

const otherTenant = (tenants ?? []).find((t) => t.id !== tenant?.id);

const { count: productCountBefore } = await admin
  .from("produtos")
  .select("id", { count: "exact", head: true })
  .eq("tenant_id", tenant.id)
  .eq("tipo", "produto")
  .is("deleted_at", null);
report.productCountBefore = productCountBefore ?? null;

let serviceId = null;
const code = `HOMOLOG-2781-${Date.now()}`;
const marker = "[TESTE 27.8.1] Serviço homologação — NÃO USAR";

if (tenant?.id) {
  // 2) Criação com todos os campos + nulos opcionais
  const { data: created, error: createErr } = await admin
    .from("produtos")
    .insert({
      tenant_id: tenant.id,
      nome: marker,
      tipo: "servico",
      codigo_interno: code,
      sku: code,
      categoria: "Homologação",
      unidade_medida: "UN",
      custo: 80,
      preco_venda: 150,
      preco_sugerido: 160,
      tempo_estimado_minutos: 90,
      especialidade: "Mecânica geral",
      equipe_ou_profissional: "Equipe A",
      unidade_cobranca: "HORA",
      observacoes: "sprint-27-8-1 homolog",
      ativo: true,
      controla_estoque: false,
      estoque_atual: 0,
    })
    .select(`id, ${COLUMNS.join(", ")}, nome, custo, preco_venda, tipo, ativo`)
    .single();

  assert(!createErr, "criar serviço com novos campos", createErr?.message);
  serviceId = created?.id ?? null;
  report.serviceTestId = serviceId;

  if (created) {
    assert(created.tipo === "servico", "tipo=servico");
    assert(created.tempo_estimado_minutos === 90, "tempo_estimado persistido");
    assert(Number(created.preco_sugerido) === 160, "preco_sugerido persistido");
    assert(created.especialidade === "Mecânica geral", "especialidade persistida");
    assert(
      created.equipe_ou_profissional === "Equipe A",
      "equipe_ou_profissional persistida",
    );
    assert(created.unidade_cobranca === "HORA", "unidade_cobranca persistida");

    // 3) Edição
    const { error: updErr } = await admin
      .from("produtos")
      .update({
        preco_sugerido: 175.5,
        tempo_estimado_minutos: 120,
        unidade_cobranca: "UN",
        equipe_ou_profissional: "Equipe B",
      })
      .eq("id", created.id)
      .eq("tenant_id", tenant.id);
    assert(!updErr, "editar serviço", updErr?.message);

    const { data: reopened, error: readErr } = await admin
      .from("produtos")
      .select(COLUMNS.join(", "))
      .eq("id", created.id)
      .single();
    assert(!readErr, "reabrir serviço", readErr?.message);
    assert(Number(reopened?.preco_sugerido) === 175.5, "edição preco_sugerido");
    assert(reopened?.tempo_estimado_minutos === 120, "edição tempo");
    assert(reopened?.unidade_cobranca === "UN", "edição unidade_cobranca");
    assert(reopened?.equipe_ou_profissional === "Equipe B", "edição equipe");

    // 4) Valores nulos
    const { error: nullErr } = await admin
      .from("produtos")
      .update({
        preco_sugerido: null,
        tempo_estimado_minutos: null,
        especialidade: null,
        equipe_ou_profissional: null,
        unidade_cobranca: null,
      })
      .eq("id", created.id);
    assert(!nullErr, "aceita nulos nos novos campos", nullErr?.message);

    // 5) Constraints — tempo negativo
    const { error: negTempo } = await admin
      .from("produtos")
      .update({ tempo_estimado_minutos: -1 })
      .eq("id", created.id);
    assert(Boolean(negTempo), "constraint bloqueia tempo negativo", negTempo?.message);

    // 6) Constraints — preço sugerido negativo
    const { error: negPreco } = await admin
      .from("produtos")
      .update({ preco_sugerido: -5 })
      .eq("id", created.id);
    assert(
      Boolean(negPreco),
      "constraint bloqueia preco_sugerido negativo",
      negPreco?.message,
    );

    // Reset valid values after constraint probes
    await admin
      .from("produtos")
      .update({
        tempo_estimado_minutos: 60,
        preco_sugerido: 100,
        especialidade: "Homolog",
        equipe_ou_profissional: "QA",
        unidade_cobranca: "UN",
      })
      .eq("id", created.id);

    // 7) Filtro / busca por código
    const { data: found } = await admin
      .from("produtos")
      .select("id, nome")
      .eq("tenant_id", tenant.id)
      .eq("tipo", "servico")
      .eq("codigo_interno", code)
      .is("deleted_at", null);
    assert((found ?? []).some((r) => r.id === created.id), "filtro por código");

    const { data: search } = await admin
      .from("produtos")
      .select("id")
      .eq("tenant_id", tenant.id)
      .eq("tipo", "servico")
      .ilike("nome", "%TESTE 27.8.1%")
      .is("deleted_at", null);
    assert((search ?? []).some((r) => r.id === created.id), "busca por nome");

    // 8) Tenant isolation (service role still scopes by tenant_id)
    if (otherTenant?.id) {
      const { data: leak } = await admin
        .from("produtos")
        .select("id")
        .eq("tenant_id", otherTenant.id)
        .eq("id", created.id)
        .limit(1);
      assert((leak ?? []).length === 0, "serviço não aparece em outro tenant");
    } else {
      const fake = crypto.randomUUID();
      const { data: leak } = await admin
        .from("produtos")
        .select("id")
        .eq("tenant_id", fake)
        .eq("id", created.id)
        .limit(1);
      assert((leak ?? []).length === 0, "serviço não aparece em tenant fake");
    }

    // 9) Soft-delete (arquivar) — sem hard delete
    const { error: softErr } = await admin
      .from("produtos")
      .update({
        deleted_at: new Date().toISOString(),
        ativo: false,
        observacoes: "sprint-27-8-1 homolog — soft-deleted",
      })
      .eq("id", created.id)
      .eq("tenant_id", tenant.id);
    assert(!softErr, "soft-delete serviço de teste", softErr?.message);

    const { data: activeList } = await admin
      .from("produtos")
      .select("id")
      .eq("id", created.id)
      .is("deleted_at", null);
    assert((activeList ?? []).length === 0, "serviço soft-deleted oculto");

    const { data: stillThere } = await admin
      .from("produtos")
      .select("id, deleted_at")
      .eq("id", created.id)
      .maybeSingle();
    assert(Boolean(stillThere?.deleted_at), "registro preservado (não hard-delete)");
  }

  // 10) RLS: anon sem sessão não lê linhas do tenant
  if (anonKey) {
    const anon = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: anonRows, error: anonErr } = await anon
      .from("produtos")
      .select("id")
      .eq("tenant_id", tenant.id)
      .limit(5);
    assert(
      !anonErr && (anonRows ?? []).length === 0,
      "RLS: anon sem membership não lista produtos",
      anonErr?.message ?? `rows=${anonRows?.length}`,
    );
  } else {
    assert(false, "NEXT_PUBLIC_SUPABASE_ANON_KEY presente para probe RLS");
  }
}

// 11) Import validation (planilha controlada — lógica pura)
const existing = new Set(["srv-existente"]);
const sheet = [
  { codigo: "srv-ok", nome: "Alinhamento", custo: 50, preco_venda: 120 },
  { codigo: "srv-c0", nome: "Custo zero", custo: 0, preco_venda: 80 },
  { codigo: "srv-p0", nome: "Preço zero", custo: 40, preco_venda: 0 },
  { codigo: "srv-lt", nome: "Preço < custo", custo: 100, preco_venda: 50 },
  { codigo: "srv-dup", nome: "Dup A", custo: 10, preco_venda: 20 },
  { codigo: "srv-dup", nome: "Dup B", custo: 10, preco_venda: 20 },
  { codigo: "srv-existente", nome: "Update", custo: 10, preco_venda: 20 },
  { codigo: "srv-cat", nome: "Cat", custo: 10, preco_venda: 20, categoria: "???" },
  { codigo: null, nome: null, custo: null, preco_venda: null },
];
const codesInSheet = new Set();
const validated = sheet.map((row) => {
  const issues = validateServiceImportRow(row, existing);
  const code = row.codigo?.trim()?.toLowerCase();
  if (code && codesInSheet.has(code)) {
    issues.push({
      level: "error",
      code: "codigo_duplicado_planilha",
      message: "Código duplicado na planilha.",
    });
  }
  if (code) codesInSheet.add(code);
  return { row, issues };
});
const summary = summarizeServiceImportValidation(validated);
assert(summary.invalidas >= 1, "import: linha incompleta invalida");
assert(summary.custoZero >= 1, "import: alerta custo zero");
assert(summary.precoZero >= 1, "import: alerta preço zero");
assert(
  validated.some((v) => v.issues.some((i) => i.code === "preco_menor_custo")),
  "import: alerta preço < custo",
);
assert(
  validated.some((v) => v.issues.some((i) => i.code === "codigo_existente")),
  "import: alerta código existente",
);
assert(
  validated.some((v) =>
    v.issues.some((i) => i.code === "codigo_duplicado_planilha"),
  ),
  "import: bloqueio duplicado na planilha",
);
assert(summary.validas >= 1, "import: pelo menos 1 linha válida");

report.importSummary = summary;

const { count: productCountAfter } = await admin
  .from("produtos")
  .select("id", { count: "exact", head: true })
  .eq("tenant_id", tenant.id)
  .eq("tipo", "produto")
  .is("deleted_at", null);
report.productCountAfter = productCountAfter ?? null;
assert(
  productCountBefore === productCountAfter,
  "nenhum produto afetado (contagem estável)",
  `before=${productCountBefore} after=${productCountAfter}`,
);

// Cleanup leftover homolog rows (keep soft-deleted marker)
const { data: leftovers } = await admin
  .from("produtos")
  .select("id")
  .eq("tenant_id", tenant.id)
  .eq("tipo", "servico")
  .ilike("nome", "%TESTE 27.8.1%")
  .is("deleted_at", null);
if (leftovers?.length) {
  await admin
    .from("produtos")
    .update({
      deleted_at: new Date().toISOString(),
      ativo: false,
      observacoes: "sprint-27-8-1 leftover cleanup",
    })
    .in(
      "id",
      leftovers.map((r) => r.id),
    );
  assert(true, `soft-delete leftovers (${leftovers.length})`);
}

report.checks = checks;
report.summary = {
  pass,
  fail,
  classificationHint:
    fail === 0 ? "APROVADO EM RUNTIME PÓS-MIGRATION (schema/crud)" : "REPROVADO",
};
writeFileSync(join(OUT, "schema-crud-report.json"), JSON.stringify(report, null, 2));
console.log(`\nSchema/CRUD: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
