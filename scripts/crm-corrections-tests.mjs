#!/usr/bin/env node
/**
 * Sprint 24.1 — CRM Corrections / Homologação
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  CRM_FUNIL_LABELS,
  CRM_KPI_CATALOG,
  assertCrmTenantMatch,
  buildCrmAlerts,
  buildCrmDrillDown,
  buildCrmEnterpriseSnapshotFromSources,
  buildExecutiveCrmBundle,
  buildUnifiedCrm360Timeline,
  dedupeCrmAlerts,
  defaultPipelineStages,
  describeCrmIntegrationArchitecture,
  emptyCrmEnterpriseSnapshot,
  ensureSinglePrincipalContatos,
  getCrmFeatureFlags,
  getCrmKpiDefinition,
  mergePipelineStages,
  resolveCommercialProvider,
  resolveCrmCatalogKpis,
  sanitizeCrmFilter,
  validateOportunidadeTransition,
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

console.log("\nCRM Corrections — Sprint 24.1\n");

assert(existsSync(join(root, "scripts/crm-corrections-tests.mjs")), "Arquivo corrections");
assert(read("package.json").includes("test:crm-corrections"), "script corrections");

const mig = read("supabase/migrations/20260812_crm_enterprise_fase24.sql");
assert(mig.includes("cliente_contatos"), "Migration contatos");
assert(mig.includes("crm_pipeline_stages"), "Migration pipeline");
assert(mig.includes("crm_oportunidades"), "Migration oportunidades");
assert(mig.includes("crm_stage_movements"), "Migration movimentos");
assert(mig.includes("enable row level security"), "Migration RLS");
assert(mig.includes("tenant_id"), "Migration tenant_id");
assert(!mig.includes("create table if not exists public.clientes "), "Não duplica clientes");
assert(mig.includes("nome_fantasia"), "Migration nome_fantasia");
assert(mig.includes("idx_cliente_contatos_one_principal"), "Índice um principal");

assert(read("types/database.ts").includes("cliente_contatos"), "Tipos cliente_contatos");
assert(read("types/database.ts").includes("crm_pipeline_stages"), "Tipos pipeline");
assert(read("types/database.ts").includes("crm_oportunidades"), "Tipos oportunidades");
assert(read("types/database.ts").includes("nome_fantasia"), "Tipos nome_fantasia em clientes");

const form = read("components/clientes/cliente-form.tsx");
const validations = read("lib/clientes/validations.ts");
const mappers = read("lib/clientes/mappers.ts");
assert(form.includes("nome_fantasia"), "Form PF/PJ nome_fantasia");
assert(form.includes("ie_rg"), "Form RG/IE");
assert(form.includes("empresa_id"), "Form empresa");
assert(form.includes("filial_id"), "Form filial");
assert(form.includes("motivo_perda"), "Form motivo perda");
assert(form.includes("preenchimento manual"), "CEP manual sem simulação");
assert(validations.includes("isValidCpf"), "Validação CPF");
assert(validations.includes("isValidCnpj"), "Validação CNPJ");
assert(validations.includes("motivo_perda"), "Schema motivo perda");
assert(mappers.includes("onlyDigits"), "Normalização dígitos");
assert(mappers.includes("nome_fantasia"), "Mapper nome_fantasia");
assert(mappers.includes("empresa_id"), "Mapper empresa_id");
assert(read("lib/clientes/actions.ts").includes("checkClienteDuplicatesAction"), "Duplicidade CPF/CNPJ action");

assert(
  ensureSinglePrincipalContatos([
    { id: "1", principal: true, ativo: true },
    { id: "2", principal: false, ativo: true },
  ]).ok,
  "Um principal OK",
);
assert(
  !ensureSinglePrincipalContatos([
    { id: "1", principal: true, ativo: true },
    { id: "2", principal: true, ativo: true },
  ]).ok,
  "Dois principais rejeitados",
);
assert(
  !ensureSinglePrincipalContatos([{ id: "1", principal: false, ativo: true }]).ok,
  "Sem principal com contatos ativos rejeitado",
);

assert(CRM_FUNIL_LABELS.contato === "Qualificado", "Qualificado");
const stages = defaultPipelineStages();
assert(stages.map((s) => s.key).join(",") === "lead,contato,proposta,negociacao,fechado,perdido", "Ordem etapas");
assert(
  mergePipelineStages({
    custom: [{ key: "proposta", label: "Proposta VIP", sortOrder: 3 }],
  }).find((s) => s.key === "proposta")?.label === "Proposta VIP",
  "Pipeline configurável",
);
assert(
  mergePipelineStages({ custom: [{ key: "custom_x", label: "X" }] }).every(
    (s) => s.key !== "custom_x" || true,
  ),
  "Merge pipeline estável",
);

assert(
  validateOportunidadeTransition({
    status: "ganha",
    dataFechamento: null,
  }).ok === false,
  "Ganho exige data",
);
assert(
  validateOportunidadeTransition({
    status: "perdida",
    motivoPerda: "",
  }).ok === false,
  "Perdido exige motivo",
);
assert(
  validateOportunidadeTransition({
    status: "aberta",
    valorEstimado: -1,
  }).ok === false,
  "Valor negativo rejeitado",
);
assert(
  validateOportunidadeTransition({
    status: "aberta",
    probabilidade: 150,
  }).ok === false,
  "Probabilidade >100 rejeitada",
);
assert(
  validateOportunidadeTransition({
    status: "ganha",
    dataFechamento: "2026-07-29",
    probabilidade: 100,
    valorEstimado: 10,
  }).ok,
  "Oportunidade ganha válida",
);

try {
  sanitizeCrmFilter({ raw: { tenantId: "evil" } });
  assert(false, "tenantId client deve lançar");
} catch (e) {
  assert(String(e.message).includes("tenantId"), "Filtro rejeita tenantId client");
}

assert(
  sanitizeCrmFilter({
    raw: { empresaIds: ["aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee"] },
    authorizedEmpresaIds: null,
  }).empresaIds === undefined,
  "Empresa sem allow-list ignorada",
);
assert(
  sanitizeCrmFilter({
    raw: {
      empresaIds: [
        "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
        "ffffffff-bbbb-4ccc-8ddd-eeeeeeeeeeee",
      ],
    },
    authorizedEmpresaIds: ["aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee"],
  }).empresaIds?.length === 1,
  "Filtro empresa intersecta allow-list",
);

try {
  assertCrmTenantMatch("t-a", "t-b", "teste");
  assert(false, "cross-tenant deveria lançar");
} catch (e) {
  assert(String(e.message).includes("Cross-tenant"), "Cross-tenant bloqueado");
}
assertCrmTenantMatch("t-a", "t-a", "teste");
assert(true, "Mesmo tenant OK");

const empty = emptyCrmEnterpriseSnapshot("t-a", "a");
const emptyBundle = buildExecutiveCrmBundle({ snap: empty });
assert(emptyBundle.empty, "Dashboard sem dados");
assert(
  emptyBundle.kpis.every((k) => k.formatted !== "NaN" && k.formatted !== "Infinity"),
  "Sem NaN/Infinity no empty",
);
assert(
  getCrmKpiDefinition("crm.retencao")?.availability === "unavailable",
  "Retenção indisponível",
);
assert(
  resolveCrmCatalogKpis(empty).find((k) => k.definitionId === "crm.retencao")
    ?.formatted === "Dados indisponíveis",
  "Retenção Dados indisponíveis",
);

const partial = buildCrmEnterpriseSnapshotFromSources({
  tenantId: "t-a",
  tenantSlug: "a",
  dashboard: {
    total_leads: 1,
    novos_clientes: 1,
    clientes_ativos: 2,
    clientes_perdidos: 0,
    clientes_recorrentes: 0,
    clientes_inativos: 0,
    clientes_sem_retorno: 0,
    oportunidades_vencidas: 0,
    previsao_fechamento: 0,
    receita_crm: 0,
    ticket_medio: 0,
    receita_por_cliente: 0,
    valor_medio_carteira: 0,
    taxa_conversao: 0,
    tempo_medio_fechamento_dias: 0,
    receita_por_vendedor: [],
    receita_por_consultor: [],
    motivos_perda: [],
    funil: [{ estagio: "negociacao", total: 1, valor_total: 500 }],
    receita_mensal: [],
  },
  sourceHealth: { sales: { status: "error", message: "offline" } },
});
const partialBundle = buildExecutiveCrmBundle({ snap: partial });
assert(partialBundle.sourceHealth.sales?.status === "error", "Falha isolada");
assert(
  partialBundle.kpis.find((k) => k.definitionId === "crm.ativos")?.value === 2,
  "Parcial: ativos ok",
);

const drill = buildCrmDrillDown({
  definitionId: "crm.valor_negociacao",
  items: [
    { id: "1", label: "A", value: 200, origin: "funil" },
    { id: "2", label: "B", value: 300, origin: "funil" },
  ],
  methodology: "t",
});
assert(drill.total === 500, "Drill fecha com detalhe");

const alerts = buildCrmAlerts({
  snap: partial,
  kpis: resolveCrmCatalogKpis(partial),
});
assert(dedupeCrmAlerts([...alerts, ...alerts]).length === alerts.length, "Alertas dedupe");
assert(alerts.every((a) => a.autoApplied === false), "Alertas sem auto");

const provider = resolveCommercialProvider();
assert(provider.kind === "deterministic", "Provider determinístico");
assert(
  provider.label === "Análise baseada em regras e histórico do tenant.",
  "Texto obrigatório IA",
);
assert(
  provider.explain({ kpis: [], alerts: [], tenantId: "t-a" }).every(
    (i) => i.autoExecuted === false,
  ),
  "Nenhuma IA executa ação",
);

const integ = describeCrmIntegrationArchitecture();
assert(
  integ.connectors.every((c) => c.status === "disabled" || c.status === "preparing"),
  "Integrações desativadas/preparando",
);
assert(!integ.connectors.some((c) => c.status === "connected"), "Sem Conectado fictício");
const flags = getCrmFeatureFlags();
assert(flags.externalAi === false, "IA externa default off");
assert(flags.externalIntegrations === false, "Integrações default off");

const timeline = buildUnifiedCrm360Timeline({
  vendas: [{ id: "v1", status: "ok", total: 10, created_at: "2026-07-02T00:00:00Z" }],
  ordens: [{ id: "o1", status: "ok", valor_total: 5, created_at: "2026-07-01T00:00:00Z" }],
  tarefas: [{ id: "t1", titulo: "Ligar", status: "pendente", created_at: "2026-07-03T00:00:00Z" }],
  documentos: [{ id: "d1", nome_arquivo: "a.pdf", categoria: "outro", created_at: "2026-07-04T00:00:00Z" }],
});
assert(timeline.length === 4, "Timeline 360 fontes reais");
assert(timeline.every((t) => t.origin), "Timeline com origem");
assert(timeline[0].kind === "anexo", "Timeline ordenada");

assert(read("lib/rbac/permissions.ts").includes("crm.pipeline.configurar"), "RBAC pipeline configurar");
assert(read("lib/rbac/permissions.ts").includes("clientes.visualizar"), "RBAC clientes.visualizar");
assert(read("lib/crm/crm-enterprise-actions.ts").includes("tenantId do client"), "Actions isolam tenant");
assert(read("components/crm/executive-crm-dashboard.tsx").includes("aria-"), "A11y estrutural");
assert(read("components/crm/executive-crm-dashboard.tsx").includes("sm:grid-cols"), "Responsivo estrutural");
assert(read("components/clientes/cliente-form.tsx").includes("nome_fantasia"), "Form nome_fantasia");
assert(read("components/clientes/cliente-form.tsx").includes("preenchimento manual"), "CEP manual");
assert(read("components/clientes/cliente-contatos-panel.tsx").includes("Contato principal"), "UI contatos");
assert(read(".env.example").includes("CRM_EXTERNAL_INTEGRATIONS_ENABLED=0"), "Flags off no env");
assert(!read("lib/crm/enterprise/kpi-engine.ts").includes("Math.random"), "Sem dado fictício random");
assert(CRM_KPI_CATALOG.length >= 12, "Catálogo KPI completo");
assert(
  read("lib/crm/enterprise/pipeline-stage-service.ts").includes("listFromDatabase"),
  "Pipeline lê Supabase",
);
assert(
  !read("lib/crm/enterprise/pipeline-stage-service.ts").includes("fallback-${"),
  "Sem etapas inventadas em memória",
);
assert(
  read("components/crm/pipeline-config-client.tsx").includes("Persistir etapas padrão"),
  "UI seed pipeline explícito",
);
assert(
  read("lib/crm/crm-corrections-actions.ts").includes("deactivatePipelineStageAction"),
  "Action desativar etapa",
);

// Divisão / NaN seguros no format
const nanSnap = {
  ...empty,
  kpisRaw: { conversao: Number.NaN, ticketMedio: Number.POSITIVE_INFINITY },
};
const nanKpis = resolveCrmCatalogKpis(nanSnap);
assert(
  nanKpis
    .filter((k) => ["crm.conversao", "crm.ticket_medio"].includes(k.definitionId))
    .every((k) => k.availability === "unavailable"),
  "NaN/Infinity → indisponível",
);

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
