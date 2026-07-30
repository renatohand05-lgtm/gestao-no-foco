#!/usr/bin/env node
/**
 * Fase 24 — CRM Core tests
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  CRM_FUNIL_LABELS,
  CRM_KPI_CATALOG,
  assertPipelineStage,
  buildCrmAlerts,
  buildCrmDrillDown,
  buildExecutiveCrmBundle,
  buildCrmEnterpriseSnapshotFromSources,
  buildUnifiedCrm360Timeline,
  dedupeCrmAlerts,
  defaultPipelineStages,
  emptyCrmEnterpriseSnapshot,
  getCrmFeatureFlags,
  getCrmKpiDefinition,
  mergePipelineStages,
  resolveCommercialProvider,
  resolveCrmCatalogKpis,
  resolveCrmKpi,
} from "../lib/crm/index.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

let pass = 0;
let fail = 0;

function assert(cond, msg) {
  if (cond) {
    pass += 1;
    console.log(`  PASS  ${msg}`);
  } else {
    fail += 1;
    console.log(`  FAIL  ${msg}`);
  }
}

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

console.log("\nCRM Core — Fase 24\n");

assert(existsSync(join(root, "lib/crm/index.ts")), "Barrel lib/crm");
assert(existsSync(join(root, "lib/crm/enterprise/orchestrator.ts")), "Orchestrator");
assert(existsSync(join(root, "lib/crm/enterprise/kpi-catalog.ts")), "KPI catalog");
assert(existsSync(join(root, "lib/crm/crm-feature-flags.ts")), "Feature flags");
assert(existsSync(join(root, "scripts/crm-core-tests.mjs")), "Script core");
assert(read("package.json").includes("test:crm-core"), "script test:crm-core");

assert(CRM_FUNIL_LABELS.contato === "Qualificado", "Label Qualificado");
assert(CRM_FUNIL_LABELS.lead === "Lead", "Label Lead");
assert(defaultPipelineStages().length === 6, "6 etapas padrão");
assert(
  mergePipelineStages({
    custom: [{ key: "contato", label: "Qualificado VIP", sortOrder: 2 }],
  }).find((s) => s.key === "contato")?.label === "Qualificado VIP",
  "Pipeline custom mescla label",
);
assert(
  mergePipelineStages({ custom: [{ key: "fake_stage", label: "X" }] }).every(
    (s) => s.key !== "fake_stage",
  ),
  "Ignora estágio não canônico",
);
assert(assertPipelineStage("bogus") === "lead", "Stage inválido → lead");

assert(CRM_KPI_CATALOG.length >= 10, "Catálogo KPI >= 10");
assert(getCrmKpiDefinition("crm.retencao")?.availability === "unavailable", "Retenção unavailable");
assert(getCrmKpiDefinition("crm.ativos")?.availability === "available", "Ativos available");

const empty = emptyCrmEnterpriseSnapshot("t-a", "a");
const emptyKpis = resolveCrmCatalogKpis(empty);
assert(
  emptyKpis.every((k) => k.availability !== "available" || k.value != null),
  "Empty sem inventar",
);
assert(
  emptyKpis.some((k) => k.formatted === "Dados indisponíveis"),
  "Dados indisponíveis",
);
assert(
  resolveCrmKpi(empty, "crm.retencao").availability === "unavailable",
  "Retenção sem valor inventado",
);

const snap = buildCrmEnterpriseSnapshotFromSources({
  tenantId: "t-a",
  tenantSlug: "a",
  asOf: "2026-07-29",
  dashboard: {
    total_leads: 5,
    novos_clientes: 3,
    clientes_ativos: 10,
    clientes_perdidos: 2,
    clientes_recorrentes: 4,
    clientes_inativos: 1,
    clientes_sem_retorno: 0,
    oportunidades_vencidas: 0,
    previsao_fechamento: 0,
    receita_crm: 1000,
    ticket_medio: 250,
    receita_por_cliente: 100,
    valor_medio_carteira: 0,
    taxa_conversao: 0.2,
    tempo_medio_fechamento_dias: 12,
    receita_por_vendedor: [],
    receita_por_consultor: [],
    motivos_perda: [],
    funil: [
      { estagio: "lead", total: 2, valor_total: 0 },
      { estagio: "proposta", total: 1, valor_total: 500 },
      { estagio: "negociacao", total: 1, valor_total: 700 },
    ],
    receita_mensal: [],
  },
  followUpsPendentes: 3,
});

assert(snap.tenantId === "t-a", "Tenant no snapshot");
assert(snap.kpisRaw.ativos === 10, "Ativos da fonte");
assert(snap.kpisRaw.valorNegociacao === 1200, "Valor negociação = proposta+negociacao");
assert(snap.kpisRaw.retencao == null, "Retenção null (sem inventar)");

const kpis = resolveCrmCatalogKpis(snap);
assert(
  kpis.find((k) => k.definitionId === "crm.ativos")?.value === 10,
  "Resolve ativos",
);
assert(
  kpis.find((k) => k.definitionId === "crm.valor_negociacao")?.value === 1200,
  "Resolve valor negociação",
);

const drill = buildCrmDrillDown({
  definitionId: "crm.valor_negociacao",
  items: [
    { id: "proposta", label: "Proposta", value: 500, origin: "funil" },
    { id: "negociacao", label: "Negociação", value: 700, origin: "funil" },
  ],
  methodology: "test",
});
assert(drill.total === 1200, "Drill fecha com agregado");
assert(drill.traceable === true, "Drill rastreável");

const alerts = buildCrmAlerts({ snap, kpis });
assert(alerts.every((a) => a.autoApplied === false), "Alertas sem auto");
assert(alerts.every((a) => a.requiresHumanReview === true), "Alertas revisão humana");
assert(dedupeCrmAlerts([...alerts, ...alerts]).length === alerts.length, "Dedupe");

const provider = resolveCommercialProvider();
assert(provider.kind === "deterministic", "Provider determinístico");
assert(
  provider.label.includes("regras") && provider.label.includes("histórico"),
  "Texto obrigatório IA comercial",
);
const insights = provider.explain({ kpis, alerts, tenantId: "t-a" });
assert(insights.every((i) => i.autoExecuted === false), "Insights não executam");
assert(
  insights.some((i) => i.limitations.some((l) => l.includes("regras"))),
  "Limitações explícitas",
);

const bundle = buildExecutiveCrmBundle({ snap });
assert(bundle.clientBase.table === "public.clientes", "Base única clientes");
assert(bundle.version === "24.0", "Versão 24");
assert(bundle.integrations.connectors.length >= 5, "5+ conectores arquitetura");
assert(
  bundle.integrations.connectors.every(
    (c) => c.status === "preparing" || c.status === "disabled",
  ),
  "Conectores não live",
);

const timeline = buildUnifiedCrm360Timeline({
  vendas: [{ id: "v1", numero: 1, status: "faturada", total: 100, created_at: "2026-07-01T10:00:00Z" }],
  ordens: [{ id: "o1", numero: 2, status: "concluida", valor_total: 50, created_at: "2026-07-02T10:00:00Z" }],
  documentos: [{ id: "d1", nome_arquivo: "c.pdf", categoria: "contrato", created_at: "2026-07-03T10:00:00Z" }],
});
assert(timeline.length === 3, "Timeline 360 unifica fontes");
assert(timeline[0].at >= timeline[1].at, "Timeline ordenada desc");
assert(timeline.every((t) => Boolean(t.origin)), "Timeline com origem");

const flags = getCrmFeatureFlags();
assert(typeof flags.enterprise === "boolean", "Flag enterprise");
assert(flags.externalAi === false || flags.externalAi === true, "Flag AI");

assert(
  !read("lib/crm/enterprise/commercial-ai-provider.ts").includes("Math.random"),
  "IA sem random",
);
assert(
  !read("lib/crm/enterprise/kpi-engine.ts").includes("Math.random"),
  "KPI engine sem random",
);

assert(
  existsSync(join(root, "supabase/migrations/20260812_crm_enterprise_fase24.sql")),
  "Migration Fase 24 presente (não executada)",
);
assert(
  read("supabase/migrations/20260812_crm_enterprise_fase24.sql").includes(
    "crm_pipeline_stages",
  ),
  "Migration pipeline stages",
);
assert(
  read("supabase/migrations/20260812_crm_enterprise_fase24.sql").includes(
    "cliente_contatos",
  ),
  "Migration contatos (filho, não segunda base)",
);

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
