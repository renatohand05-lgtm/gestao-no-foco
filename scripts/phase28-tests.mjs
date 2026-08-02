#!/usr/bin/env node
/**
 * Fase 28 — suites contractuais (28.1–28.6)
 * Uso: node --experimental-strip-types scripts/phase28-tests.mjs <suite|all>
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  classifyAbcCurve,
  suggestReposicao,
} from "../lib/estoque/abc/abc-curve.ts";
import { detectAgendaConflicts } from "../lib/agenda/conflict.ts";
import {
  buildAgingReport,
  classifyAgingBucket,
} from "../lib/finance/aging/aging.ts";
import {
  computeBudgetVariance,
  summarizeBudgetVariance,
} from "../lib/finance/budget/budget-variance.ts";
import {
  WORK_ORDER_TEMPLATES,
  WORK_ORDER_TIPOS,
} from "../lib/ordens/work-order/templates.ts";
import {
  filterLeadInbox,
  labelOrigemCrm,
  nextStageAfterLeadConversion,
  summarizeLeadInbox,
} from "../lib/crm/phase28/leads-inbox.ts";
import {
  EXTERNAL_CHANNEL_CONTRACTS,
  planLeadToCliente,
  planOportunidadeToOrcamento,
  planOrcamentoToVendaOuOs,
} from "../lib/crm/phase28/conversion.ts";
import { ALL_PERMISSION_KEYS } from "../lib/rbac/permissions.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const suite = (process.argv[2] || "all").toLowerCase();

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

function exists(rel) {
  return existsSync(join(root, rel));
}

function ensureEvidenceDirs() {
  const dirs = [
    "docs/testing/evidence/28/crm",
    "docs/testing/evidence/28/purchases",
    "docs/testing/evidence/28/inventory",
    "docs/testing/evidence/28/work-orders",
    "docs/testing/evidence/28/schedule",
    "docs/testing/evidence/28/finance",
  ];
  for (const d of dirs) {
    const p = join(root, d);
    if (!existsSync(p)) mkdirSync(p, { recursive: true });
    const keep = join(p, ".gitkeep");
    if (!existsSync(keep)) writeFileSync(keep, "");
  }
}

function runCrm() {
  console.log("\n[phase28-crm]");
  assert(exists("app/(app)/[tenant]/crm/leads/page.tsx"), "page leads");
  assert(
    exists("app/(app)/[tenant]/crm/oportunidades/page.tsx"),
    "page oportunidades",
  );
  assert(
    exists("app/(app)/[tenant]/crm/follow-ups/page.tsx"),
    "page follow-ups",
  );
  assert(
    exists("app/(app)/[tenant]/crm/indicadores/page.tsx"),
    "page indicadores",
  );
  assert(exists("lib/crm/phase28/leads-inbox.ts"), "leads-inbox");
  assert(exists("lib/crm/phase28/conversion.ts"), "conversion");
  assert(exists("components/crm/convert-lead-button.tsx"), "convert lead UI");
  assert(
    read("lib/crm/actions.ts").includes("convertLeadToClienteAction"),
    "convertLeadToClienteAction",
  );
  assert(nextStageAfterLeadConversion("lead") === "contato", "lead→contato");
  assert(planLeadToCliente("lead").ok === true, "plan lead ok");
  assert(planLeadToCliente("contato").ok === false, "plan lead reject non-lead");
  assert(
    planOportunidadeToOrcamento().ok === true &&
      planOportunidadeToOrcamento().status === "ok",
    "opp→orçamento wired",
  );
  assert(
    exists("lib/crm/phase28/conversion-service.ts"),
    "conversion-service",
  );
  assert(
    exists("lib/crm/phase28/conversion-actions.ts"),
    "conversion-actions",
  );
  assert(
    EXTERNAL_CHANNEL_CONTRACTS.filter((c) => c.channel !== "calendario").every(
      (c) =>
        ["nao_configurado", "aguardando_integracao", "indisponivel"].includes(
          c.status,
        ),
    ),
    "canais externos não fingem ativos (exceto calendário wired)",
  );
  const rows = [
    {
      id: "1",
      nome: "Ana",
      empresa: null,
      telefone: null,
      email: null,
      origem: "site",
      segmento: null,
      responsavelId: null,
      responsavelNome: null,
      status: "lead",
      prioridade: "alta",
      score: 10,
      valorPotencial: 1000,
      proximaAcao: null,
      dataProximaAcao: null,
      tags: [],
    },
  ];
  assert(filterLeadInbox(rows, { q: "ana" }).length === 1, "filter lead");
  assert(summarizeLeadInbox(rows).altaPrioridade === 1, "summary alta");
  assert(
    labelOrigemCrm("ordem_de_servico") === "Ordem de serviço",
    "label origem sem snake_case",
  );
  assert(
    read("app/(app)/[tenant]/crm/indicadores/page.tsx").includes(
      "data-phase28",
    ),
    "indicadores data-phase28",
  );
}

function runPurchases() {
  console.log("\n[phase28-purchases]");
  assert(exists("app/(app)/[tenant]/compras/indicadores/page.tsx"), "indicadores");
  assert(
    read("components/supply/purchase-orders-client.tsx").includes(
      "cotacao: \"comparacao\"",
    ) ||
      read("components/supply/purchase-orders-client.tsx").includes(
        "cotacao: 'comparacao'",
      ),
    "fluxo cotacao→comparacao",
  );
  assert(
    read("app/(app)/[tenant]/compras/indicadores/page.tsx").includes(
      "data-phase28",
    ),
    "compras data-phase28",
  );
}

function runInventory() {
  console.log("\n[phase28-inventory]");
  assert(exists("app/(app)/[tenant]/estoque/abc/page.tsx"), "abc page");
  assert(
    exists("app/(app)/[tenant]/estoque/reposicao/page.tsx"),
    "reposicao page",
  );
  const curve = classifyAbcCurve([
    { id: "a", label: "A", valor: 80 },
    { id: "b", label: "B", valor: 15 },
    { id: "c", label: "C", valor: 5 },
  ]);
  assert(curve[0]?.classe === "A", "ABC A");
  assert(curve[2]?.classe === "C", "ABC C");
  const sug = suggestReposicao({
    produtoId: "p1",
    label: "P1",
    estoqueAtual: 1,
    estoqueMinimo: 10,
  });
  assert(sug != null && sug.quantidadeSugerida > 0, "sugestão reposição");
  assert(
    read("app/(app)/[tenant]/estoque/reposicao/page.tsx").includes(
      "Não gera pedido automaticamente",
    ) ||
      read("app/(app)/[tenant]/estoque/reposicao/page.tsx").includes(
        "não gera pedido",
      ),
    "reposicao sem auto-pedido",
  );
}

function runWorkOrders() {
  console.log("\n[phase28-work-orders]");
  assert(exists("app/(app)/[tenant]/ordens/templates/page.tsx"), "templates");
  assert(WORK_ORDER_TIPOS.includes("oficina"), "tipo oficina");
  assert(WORK_ORDER_TEMPLATES.length >= 8, "templates >= 8");
  assert(
    exists("supabase/migrations/20260802_phase28_work_order_tipo.sql"),
    "migration tipo_ordem",
  );
  assert(
    read("components/ordens/os-open-form.tsx").includes("tipo_ordem"),
    "form tipo_ordem",
  );
  assert(
    read("lib/ordens/validations.ts").includes("tipo_ordem"),
    "schema tipo_ordem",
  );
}

function runSchedule() {
  console.log("\n[phase28-schedule]");
  assert(exists("app/(app)/[tenant]/agenda/page.tsx"), "agenda page");
  assert(exists("components/agenda/agenda-week-board.tsx"), "week board");
  assert(exists("lib/agenda/agenda-service.ts"), "agenda service");
  assert(exists("lib/agenda/actions.ts"), "agenda actions");
  assert(
    exists("components/agenda/agenda-event-create-form.tsx"),
    "agenda create form",
  );
  assert(
    exists("supabase/migrations/20260802_phase28_agenda_resources.sql"),
    "migration agenda",
  );
  const conflicts = detectAgendaConflicts(
    {
      id: "x",
      inicio: "2026-08-01T10:00:00",
      fim: "2026-08-01T11:00:00",
      responsavelId: "u1",
    },
    [
      {
        id: "y",
        inicio: "2026-08-01T10:30:00",
        fim: "2026-08-01T11:30:00",
        responsavelId: "u1",
      },
    ],
  );
  assert(
    conflicts.some((c) => c.type === "profissional_ocupado"),
    "conflito profissional",
  );
  assert(
    read("app/(app)/[tenant]/agenda/page.tsx").includes("aguardando"),
    "calendário externo não ativo",
  );
}

function runFinance() {
  console.log("\n[phase28-finance]");
  assert(exists("app/(app)/[tenant]/financeiro/cfo/page.tsx"), "cfo");
  assert(exists("app/(app)/[tenant]/financeiro/aging/page.tsx"), "aging");
  assert(
    exists("app/(app)/[tenant]/financeiro/orcamento/page.tsx"),
    "orcamento",
  );
  assert(
    exists("app/(app)/[tenant]/financeiro/orcamento/novo/page.tsx"),
    "orcamento novo",
  );
  assert(
    exists("app/(app)/[tenant]/financeiro/orcamento/[id]/page.tsx"),
    "orcamento detail",
  );
  assert(exists("lib/finance/budget/budget-service.ts"), "budget service");
  assert(exists("lib/finance/budget/actions.ts"), "budget actions");
  assert(
    exists("supabase/migrations/20260802_phase28_finance_budget.sql"),
    "migration budget",
  );
  assert(classifyAgingBucket("2026-07-20", "2026-08-01") === "0_30", "aging bucket");
  const report = buildAgingReport(
    [
      {
        id: "1",
        valor: 100,
        dataVencimento: "2026-07-20",
      },
      {
        id: "2",
        valor: 50,
        dataVencimento: "2026-09-01",
      },
    ],
    "2026-08-01",
  );
  assert(report.totalVencido === 100, "aging vencido");
  assert(report.totalAVencer === 50, "aging a vencer");
  const v = computeBudgetVariance({
    id: "1",
    label: "R",
    natureza: "receita",
    orcado: 100,
    realizado: 120,
  });
  assert(v.favoravel === true, "variance receita favorável");
  assert(summarizeBudgetVariance([v]).diferenca === 20, "summary Δ");
  const nav = read("components/finance/finance-navigation.tsx");
  assert(nav.includes('href: "cfo"'), "nav cfo");
  assert(nav.includes('href: "aging"'), "nav aging");
  assert(nav.includes('href: "orcamento"'), "nav orcamento");
}

function runCross() {
  console.log("\n[phase28-cross-module]");
  assert(exists("docs/architecture/PHASE_28_ENTERPRISE.md"), "arch doc");
  assert(exists("docs/architecture/PHASE_28_MIGRATIONS.md"), "mig doc");
  assert(
    exists("supabase/migrations/20260802_phase28_crm_rbac_fields.sql"),
    "mig crm",
  );
  const pkg = read("package.json");
  for (const s of [
    "test:phase28-crm",
    "test:phase28-purchases",
    "test:phase28-inventory",
    "test:phase28-work-orders",
    "test:phase28-schedule",
    "test:phase28-finance",
    "test:phase28-cross-module",
    "test:phase28-rbac",
    "test:phase28-tenant-isolation",
    "test:phase28-navigation",
    "test:phase28-responsive",
    "test:phase28-runtime",
    "test:phase28-budget-crud",
    "test:phase28-schedule-crud",
    "test:phase28-conversions",
    "test:phase28-conversion-idempotency",
    "test:phase28-conversion-rollback",
    "test:phase28-types-contract",
    "test:phase28-runtime-final",
  ]) {
    assert(pkg.includes(s), `script ${s}`);
  }
}

function runRbac() {
  console.log("\n[phase28-rbac]");
  const keys = new Set(ALL_PERMISSION_KEYS);
  for (const k of [
    "crm.converter",
    "crm.configurar",
    "crm.ver_todos_responsaveis",
    "agenda.visualizar",
    "agenda.sobrescrever_conflito",
    "financeiro.cfo.visualizar",
    "financeiro.aging.visualizar",
    "financeiro.orcamento.visualizar",
    "os.templates.configurar",
  ]) {
    assert(keys.has(k), `perm ${k}`);
  }
  assert(
    read("lib/rbac/role-permissions.ts").includes('byPrefix(["agenda"])'),
    "comercial/ops agenda prefix",
  );
}

function runTenant() {
  console.log("\n[phase28-tenant-isolation]");
  for (const rel of [
    "app/(app)/[tenant]/crm/leads/page.tsx",
    "app/(app)/[tenant]/agenda/page.tsx",
    "app/(app)/[tenant]/estoque/abc/page.tsx",
    "app/(app)/[tenant]/financeiro/aging/page.tsx",
  ]) {
    const src = read(rel);
    assert(
      src.includes("requireTenant") || src.includes("requireFinancePagePermission"),
      `${rel} auth tenant`,
    );
    assert(
      src.includes("tenant.id") || src.includes("tenant_id") || src.includes("auth.tenant"),
      `${rel} escopo tenant`,
    );
  }
}

function runNavigation() {
  console.log("\n[phase28-navigation]");
  const nav = read("config/navigation.ts");
  assert(nav.includes('id: "agenda"'), "sidebar agenda");
  assert(nav.includes("/agenda"), "href agenda");
  assert(
    read("components/crm/crm-enterprise-navigation.tsx").includes("crm/leads"),
    "crm nav leads",
  );
  assert(
    read("components/ordens/os-subnav.tsx").includes("templates"),
    "os subnav templates",
  );
}

function runResponsive() {
  console.log("\n[phase28-responsive]");
  assert(
    read("components/agenda/agenda-week-board.tsx").includes("md:grid-cols-7"),
    "agenda semana responsive",
  );
  assert(
    read("app/(app)/[tenant]/crm/leads/page.tsx").includes("sm:grid-cols"),
    "leads grid responsive",
  );
  assert(
    read("app/(app)/[tenant]/financeiro/cfo/page.tsx").includes("sm:grid-cols"),
    "cfo grid responsive",
  );
}

function runRuntime() {
  console.log("\n[phase28-runtime]");
  ensureEvidenceDirs();
  for (const attr of [
    ["crm/leads/page.tsx", "crm-leads"],
    ["agenda/page.tsx", "agenda"],
    ["financeiro/cfo/page.tsx", "finance-cfo"],
    ["estoque/abc/page.tsx", "estoque-abc"],
  ]) {
    const [file, marker] = attr;
    assert(
      read(`app/(app)/[tenant]/${file}`).includes(`data-phase28="${marker}"`),
      `runtime marker ${marker}`,
    );
  }
  assert(
    !read("lib/crm/phase28/conversion.ts").includes("whatsapp ativo"),
    "sem mock whatsapp ativo",
  );
}

function runBudgetCrud() {
  console.log("\n[phase28-budget-crud]");
  assert(exists("lib/finance/budget/budget-service.ts"), "service");
  assert(exists("lib/finance/budget/actions.ts"), "actions");
  assert(exists("lib/finance/budget/validations.ts"), "validations");
  assert(
    exists("components/finance/finance-budget-form.tsx"),
    "form",
  );
  assert(
    exists("components/finance/finance-budget-actions.tsx"),
    "actions UI",
  );
  const svc = read("lib/finance/budget/budget-service.ts");
  for (const m of [
    "async create",
    "async update",
    "async duplicate",
    "async setStatus",
    "async softDelete",
    "async exportPayload",
  ]) {
    assert(svc.includes(m), m);
  }
  const actions = read("lib/finance/budget/actions.ts");
  assert(actions.includes("createFinanceBudgetAction"), "create action");
  assert(actions.includes("setFinanceBudgetStatusAction"), "status action");
  assert(actions.includes("exportFinanceBudgetAction"), "export action");
}

function runScheduleCrud() {
  console.log("\n[phase28-schedule-crud]");
  const svc = read("lib/agenda/agenda-service.ts");
  for (const m of [
    "async create",
    "async update",
    "async cancel",
    "async softDelete",
    "async duplicate",
    "async reschedule",
    "MAX_RECURRENCE",
  ]) {
    assert(svc.includes(m), m);
  }
  assert(exists("lib/agenda/actions.ts"), "agenda actions");
  assert(
    read("lib/agenda/actions.ts").includes("createAgendaEventAction"),
    "createAgendaEventAction",
  );
  assert(
    read("app/(app)/[tenant]/agenda/page.tsx").includes("view="),
    "views dia/semana/mes/lista",
  );
}

function runConversions() {
  console.log("\n[phase28-conversions]");
  assert(planOportunidadeToOrcamento().ok, "plan opp ok");
  assert(planOrcamentoToVendaOuOs("venda").ok, "plan orc→venda ok");
  assert(planOrcamentoToVendaOuOs("os").ok, "plan orc→os ok");
  const svc = read("lib/crm/phase28/conversion-service.ts");
  assert(svc.includes("oportunidadeToOrcamento"), "opp→orcamento exec");
  assert(svc.includes("orcamentoToVenda"), "orc→venda exec");
  assert(svc.includes("orcamentoToOs"), "orc→os exec");
  assert(svc.includes("agendaToTarefa"), "agenda→tarefa");
  assert(svc.includes("agendaToOs"), "agenda→os");
  assert(svc.includes("OPP_MARKER"), "idempotency marker opp");
  assert(svc.includes("VENDA_OS_MARKER"), "idempotency marker os");
  const acts = read("lib/crm/phase28/conversion-actions.ts");
  assert(acts.includes("convertOportunidadeToOrcamentoAction"), "action opp");
  assert(acts.includes("convertOrcamentoToVendaAction"), "action venda");
  assert(acts.includes("convertOrcamentoToOsAction"), "action os");
}

function runConversionIdempotency() {
  console.log("\n[phase28-conversion-idempotency]");
  const svc = read("lib/crm/phase28/conversion-service.ts");
  assert(svc.includes('status: "idempotent"'), "idempotent status");
  assert(svc.includes('ilike("observacoes"'), "marker lookup");
  assert(svc.includes("OPP_MARKER"), "opp marker fn");
  assert(svc.includes("AGENDA_OS_MARKER"), "agenda os marker");
}

function runConversionRollback() {
  console.log("\n[phase28-conversion-rollback]");
  // Contractual: falhas retornam ok:false sem silent success
  const svc = read("lib/crm/phase28/conversion-service.ts");
  assert(svc.includes('status: "indisponivel"'), "indisponivel path");
  assert(svc.includes("Cliente sem veículo"), "fail claro sem veículo");
  assert(
    !svc.includes("catch { return { ok: true"),
    "sem sucesso silencioso em catch",
  );
  const acts = read("lib/crm/phase28/conversion-actions.ts");
  assert(acts.includes("success: false"), "action error feedback");
}

function runTypesContract() {
  console.log("\n[phase28-types-contract]");
  const db = read("types/database.ts");
  assert(db.includes("finance_budgets:"), "types finance_budgets");
  assert(db.includes("finance_budget_lines:"), "types finance_budget_lines");
  assert(db.includes("agenda_eventos:"), "types agenda_eventos");
  assert(db.includes("agenda_recursos:"), "types agenda_recursos");
  assert(db.includes("centros_resultado:"), "types centros_resultado");
  assert(exists("scripts/merge-phase28-database-types.mjs"), "merge script");
  assert(
    exists("docs/architecture/PHASE_28_TYPES_AUDIT.md") ||
      exists("docs/architecture/PHASE_28_9_TYPES_FINAL.md"),
    "types audit doc",
  );
}

function runRuntimeFinal() {
  console.log("\n[phase28-runtime-final]");
  assert(
    exists("components/vendas/convert-orcamento-buttons.tsx"),
    "UI convert orçamento",
  );
  assert(
    exists("components/crm/convert-opp-orcamento-button.tsx"),
    "UI convert opp",
  );
  assert(
    exists("app/(app)/[tenant]/financeiro/orcamento/novo/page.tsx"),
    "orcamento novo page",
  );
  assert(
    read("app/(app)/[tenant]/agenda/page.tsx").includes("AgendaEventCreateForm"),
    "agenda create wired",
  );
  assert(
    read("components/vendas/venda-detail.tsx").includes("ConvertOrcamentoButtons"),
    "venda detail convert",
  );
}

const runners = {
  crm: runCrm,
  purchases: runPurchases,
  inventory: runInventory,
  "work-orders": runWorkOrders,
  schedule: runSchedule,
  finance: runFinance,
  "cross-module": runCross,
  rbac: runRbac,
  "tenant-isolation": runTenant,
  navigation: runNavigation,
  responsive: runResponsive,
  runtime: runRuntime,
  "budget-crud": runBudgetCrud,
  "schedule-crud": runScheduleCrud,
  conversions: runConversions,
  "conversion-idempotency": runConversionIdempotency,
  "conversion-rollback": runConversionRollback,
  "types-contract": runTypesContract,
  "runtime-final": runRuntimeFinal,
};

console.log(`\nFase 28 tests — suite=${suite}\n`);

if (suite === "all") {
  for (const fn of Object.values(runners)) fn();
} else if (runners[suite]) {
  runners[suite]();
} else {
  console.error(`Suite desconhecida: ${suite}`);
  console.error(`Disponíveis: all, ${Object.keys(runners).join(", ")}`);
  process.exit(2);
}

console.log(`\nResumo: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
