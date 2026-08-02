#!/usr/bin/env node
/**
 * Sprint 27.8.3 — Meta no Dashboard: resolução, timezone, precedência, refresh.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  classifyMetaDiaStatus,
} from "../lib/dashboard/faturamento-agregacao.ts";
import { buildCommandGoals } from "../lib/executive-command-center/aggregator.ts";
import {
  competenciaMonthEnd,
  metaOverlapsPeriod,
  pickMetaByScopePrecedence,
} from "../lib/metas/meta-scope.ts";
import { currentCompetenciaInTimezone } from "../lib/metas/meta-timezone.ts";

const root = process.cwd();
const suite = process.argv[2] ?? "all";
let pass = 0;
let fail = 0;

function assert(cond, msg) {
  if (cond) {
    pass += 1;
    console.log("  PASS", msg);
  } else {
    fail += 1;
    console.log("  FAIL", msg);
  }
}

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

function exists(rel) {
  return existsSync(join(root, rel));
}

function runGoalPersistence() {
  console.log("\n## goal-persistence\n");
  assert(exists("lib/metas/actions.ts"), "actions existe");
  assert(exists("lib/metas/meta-vendas-service.ts"), "service existe");
  const svc = read("lib/metas/meta-vendas-service.ts");
  assert(svc.includes("metas_vendas_mensais"), "grava em metas_vendas_mensais");
  assert(svc.includes("valor_meta"), "persiste valor_meta");
  assert(svc.includes("competencia"), "persiste competencia");
  assert(svc.includes("resolveMetaMensalVigente"), "leitura usa canônico");
  const mig = read("supabase/migrations/20260714_create_metas_vendas_mensais.sql");
  assert(mig.includes("create table"), "migration da tabela");
}

function runGoalPeriod() {
  console.log("\n## goal-period-resolution\n");
  assert(
    metaOverlapsPeriod("2026-08-01", "2026-08-01", "2026-08-31"),
    "agosto cobre agosto",
  );
  assert(
    !metaOverlapsPeriod("2026-07-01", "2026-08-01", "2026-08-31"),
    "julho não cobre agosto",
  );
  assert(
    metaOverlapsPeriod("2026-08-01", "2026-07-31", "2026-08-01"),
    "borda 31/07–01/08",
  );
  assert(competenciaMonthEnd("2026-08-01") === "2026-08-31", "fim agosto");
  const src = read("lib/metas/resolve-meta-mensal.ts");
  assert(src.includes("metaOverlapsPeriod"), "helper no resolver");
}

function runGoalScope() {
  console.log("\n## goal-scope-precedence\n");
  const geral = {
    id: "g",
    valor_meta: 100,
    centro_custo_id: null,
    competencia: "2026-08-01",
  };
  const centro = {
    id: "c",
    valor_meta: 200,
    centro_custo_id: "cc-1",
    competencia: "2026-08-01",
  };
  const p1 = pickMetaByScopePrecedence([geral, centro], {
    centroCustoId: "cc-1",
  });
  assert(p1?.row.id === "c" && p1.origem === "centro", "centro > geral");
  const p2 = pickMetaByScopePrecedence([geral, centro], {});
  assert(p2?.row.id === "g" && p2.origem === "geral", "sem filtro → geral");
  const p3 = pickMetaByScopePrecedence([centro], { centroCustoId: "outro" });
  assert(p3 === null, "sem geral e centro diferente → null");
  const p4 = pickMetaByScopePrecedence([geral], { centroCustoId: "cc-1" });
  assert(p4?.origem === "fallback_geral", "fallback geral");
}

function runGoalTimezone() {
  console.log("\n## goal-timezone\n");
  // 01/08/2026 02:00 UTC = 31/07/2026 23:00 America/Sao_Paulo
  const edgeJul = new Date("2026-08-01T02:00:00.000Z");
  assert(
    currentCompetenciaInTimezone(edgeJul) === "2026-07-01",
    "UTC Aug1 02h → competência julho SP",
  );

  // 01/08/2026 04:00 UTC = 01/08/2026 01:00 SP
  const edgeAug = new Date("2026-08-01T04:00:00.000Z");
  assert(
    currentCompetenciaInTimezone(edgeAug) === "2026-08-01",
    "UTC Aug1 04h → competência agosto SP",
  );

  const dre = read("lib/financeiro/dre-service.ts");
  assert(dre.includes("civilDateInTimezone"), "defaultDrePeriodo usa SP");
  const period = read("lib/dashboard/period.ts");
  assert(period.includes("civilDateInTimezone"), "period defaults SP");
  const proj = read("lib/metas/projection.ts");
  assert(proj.includes("civilPartsInSp"), "projeção usa SP");
}

function runDashboardGoalSource() {
  console.log("\n## dashboard-goal-source\n");
  const dia = read("lib/dashboard/vendas-dia-service.ts");
  assert(dia.includes("resolveMetaMensalVigente"), "vendas-dia canônico");
  assert(dia.includes("zero_fds"), "trata FDS");
  assert(dia.includes("metaHojeResolved.fonte"), "fonte na classificação");
  const map = read("lib/dashboard/premium-dashboard-map.ts");
  assert(map.includes("Meta não cadastrada"), "KPI ausência correta");
  assert(
    !map.includes('title: "Meta do mês"') ||
      map.includes(': "Meta não cadastrada"'),
    "KPI meta usa label canônico",
  );
  const brief = read("lib/dashboard/executive-brief.ts");
  assert(brief.includes("hoje.mes.meta"), "brief usa valor absoluto");
  const header = read("components/gf/gf-executive-header.tsx");
  assert(header.includes("Meta do mês"), "header mostra meta mensal");
  const snap = read("lib/analytics/snapshot-loader.ts");
  assert(snap.includes("await createCommercialPanelService"), "analytics await factory");
  assert(snap.includes("proj.valor_meta"), "analytics usa valor_meta");
  assert(!snap.includes("proj.meta)"), "analytics não usa alias inventado proj.meta");
}

function runDashboardGoalRefresh() {
  console.log("\n## dashboard-goal-refresh\n");
  const actions = read("lib/metas/actions.ts");
  assert(
    actions.includes("revalidatePath(`/${tenantSlug}/dashboard`)"),
    "path dashboard",
  );
  assert(actions.includes("analytics"), "path analytics");
  assert(actions.includes("METAS_VENDAS_CACHE_TAG"), "tag constante");
  assert(actions.includes("revalidateTag"), "revalidateTag");
  assert(actions.includes("updateTag"), "updateTag");
  const refresh = read("components/dashboard/dashboard-refresh-button.tsx");
  assert(refresh.includes("router.refresh"), "router.refresh no dashboard");
}

function runGoalTenant() {
  console.log("\n## goal-tenant-isolation\n");
  const src = read("lib/metas/resolve-meta-mensal.ts");
  assert(src.includes('.eq("tenant_id", tenantId)'), "filtra tenant");
  assert(src.includes("deleted_at"), "soft-delete");
  assert(src.includes("pickMetaByScopePrecedence"), "precedência");
}

function runGoalRuntime() {
  console.log("\n## goal-runtime\n");
  assert(
    classifyMetaDiaStatus(null, null, "zero_fds") === "fim_semana",
    "FDS ≠ sem_meta",
  );
  assert(
    classifyMetaDiaStatus(null, null, "zero_fechado") === "dia_fechado",
    "fechado ≠ sem_meta",
  );
  assert(
    classifyMetaDiaStatus(null, null, "sem_meta") === "sem_meta",
    "sem_meta real",
  );
  assert(classifyMetaDiaStatus(50, 1000) === "abaixo", "abaixo");
  const noMeta = buildCommandGoals({ feeds: null, hoje: { metaMes: null } });
  assert(
    noMeta.metaMesLabel === "Meta não cadastrada",
    "ECC ausência ≠ R$ 0",
  );
  const withMeta = buildCommandGoals({
    feeds: null,
    hoje: { metaMes: 132500, percentualMes: 4.9, projecaoFechamento: null },
  });
  assert(withMeta.available === true, "ECC com meta available");
  assert(
    String(withMeta.metaMesLabel).includes("132") ||
      String(withMeta.metaMesLabel).includes("133"),
    "ECC mostra valor real",
  );
}

const runners = {
  "goal-persistence": runGoalPersistence,
  "goal-period-resolution": runGoalPeriod,
  "goal-scope-precedence": runGoalScope,
  "goal-timezone": runGoalTimezone,
  "dashboard-goal-source": runDashboardGoalSource,
  "dashboard-goal-refresh": runDashboardGoalRefresh,
  "goal-tenant-isolation": runGoalTenant,
  "goal-runtime": runGoalRuntime,
  all() {
    for (const [k, fn] of Object.entries(runners)) {
      if (k === "all") continue;
      fn();
    }
  },
};

console.log("\nSprint 27.8.3 tests —", suite);
const fn = runners[suite];
if (!fn) {
  console.error("Suite desconhecida:", suite);
  process.exit(1);
}
fn();
console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
