#!/usr/bin/env node
/**
 * Sprint 30.5 — CRM Dashboard Premium contract.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildClientsAtRisk } from "../lib/crm/premium/clients-at-risk.ts";
import { buildOwnerRanking } from "../lib/crm/premium/owner-ranking.ts";

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

console.log("Phase 30.5 — crm-dashboard\n");

const files = [
  "components/crm/premium/crm-premium-dashboard.tsx",
  "lib/crm/premium/compose-dashboard.ts",
  "lib/crm/premium/types.ts",
  "app/(app)/[tenant]/crm/executivo/page.tsx",
];
for (const f of files) check(`file ${f}`, existsSync(resolve(f)));

const ui = readFileSync(
  resolve("components/crm/premium/crm-premium-dashboard.tsx"),
  "utf8",
);
for (const label of [
  "Oportunidades",
  "Valor do pipeline",
  "Receita prevista",
  "Receita provável",
  "Receita fechada",
  "Taxa de conversão",
  "Ticket médio",
  "Follow-ups pendentes",
  "Oportunidades paradas",
  "Clientes sem contato",
  "Motivos de perda",
  "Clientes em risco",
  "Responsáveis",
]) {
  check(`UI ${label}`, ui.includes(label));
}
check("sem inventar", /sem métricas inventadas|dados reais/i.test(ui));
check("MoM", /vs mês ant|Sem base no período/.test(ui));

const page = readFileSync(
  resolve("app/(app)/[tenant]/crm/executivo/page.tsx"),
  "utf8",
);
check("usa cache premium", /getCachedCrmPremiumDashboard/.test(page));
check("Suspense", /Suspense/.test(page));

const risk = buildClientsAtRisk([
  {
    id: "c1",
    nome: "Risco",
    estagio: "proposta",
    updatedAt: "2026-06-01T00:00:00Z",
    ultimoContatoAt: "2026-06-01T00:00:00Z",
    followUpVencido: true,
    openOppStale: true,
    activityCount30d: 0,
    commercialScore: 20,
  },
]);
check("risco detectado", risk.length === 1 && risk[0].priority === "alta");

const owners = buildOwnerRanking({
  opps: [
    {
      id: "1",
      tenant_id: "t",
      cliente_id: "c",
      empresa_id: null,
      filial_id: null,
      titulo: "X",
      stage_key: "fechado",
      valor_estimado: 1000,
      probabilidade: 100,
      data_prevista: null,
      data_fechamento: "2026-08-01",
      origem: null,
      responsavel_id: "u1",
      produto_servico: null,
      status: "ganha",
      motivo_perda: null,
      created_by: null,
      updated_by: null,
      created_at: "2026-07-01T00:00:00Z",
      updated_at: "2026-08-01T00:00:00Z",
      deleted_at: null,
    },
  ],
  followUpsByOwner: new Map([["u1", 2]]),
  activitiesByOwner: new Map(),
  nameByOwner: new Map([["u1", "Ana"]]),
});
check("ranking Ana #1", owners[0]?.nome === "Ana" && owners[0]?.rank === 1);

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
