#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
let okCount = 0;
let failCount = 0;

function ok(msg) {
  okCount += 1;
  console.log(`  OK  ${msg}`);
}
function bad(msg) {
  failCount += 1;
  console.log(` FAIL ${msg}`);
}

console.log("\nSprint 15 — preflight\n");

const required = [
  "supabase/migrations/20260730_os_dashboard_itens_exclusao.sql",
  "supabase/migrations/20260731_fix_faturar_receber_min_uuid.sql",
  "supabase/migrations/20260801_sprint15_centro_operacoes.sql",
  "supabase/migrations/20260802_gate2_recursos_alertas.sql",
  "lib/operacoes/metricas.ts",
  "lib/operacoes/centro-operacoes-service.ts",
  "lib/operacoes/alertas-service.ts",
  "lib/operacoes/recursos-actions.ts",
  "lib/operacoes/dashboard-prefs-service.ts",
  "lib/operacoes/mecanicos-dashboard-service.ts",
  "lib/operacoes/recursos-service.ts",
  "lib/estoque/estoque-dashboard-service.ts",
  "components/operacoes/operacao-board.tsx",
  "components/operacoes/centro-ops-kpi-cards.tsx",
  "components/operacoes/recursos-manager.tsx",
  "components/operacoes/alertas-manager.tsx",
  "components/operacoes/dashboard-prefs-editor.tsx",
  "components/operacoes/centro-ops-live-panel.tsx",
  "app/(app)/[tenant]/centro-operacoes/page.tsx",
  "app/(app)/[tenant]/centro-operacoes/alertas/page.tsx",
  "app/(app)/[tenant]/centro-operacoes/recursos/page.tsx",
  "app/(app)/[tenant]/ordens/mecanicos/page.tsx",
  "app/(app)/[tenant]/estoque/dashboard/page.tsx",
  "app/(app)/[tenant]/financeiro/dashboard/page.tsx",
  "docs/architecture/SPRINT15_METRICAS.md",
];

for (const f of required) {
  if (existsSync(resolve(root, f))) ok(f);
  else bad(`missing ${f}`);
}

const nav = readFileSync(resolve(root, "config/navigation.ts"), "utf8");
if (nav.includes("centro-operacoes") && nav.includes("Centro de Operações")) {
  ok("nav Centro de Operações");
} else bad("nav missing Centro de Operações");

const perm = readFileSync(resolve(root, "lib/permissoes/constants.ts"), "utf8");
for (const k of [
  "centro_operacoes.visualizar",
  "centro_operacoes.alterar_status",
  "centro_operacoes.ver_alertas",
  "dashboard.visualizar_executivo",
  "dashboard.visualizar_estoque",
  "dashboard.visualizar_mecanicos",
  "dashboard.personalizar",
]) {
  if (perm.includes(`"${k}"`)) ok(`permission ${k}`);
  else bad(`missing permission ${k}`);
}

const mig = readFileSync(
  resolve(root, "supabase/migrations/20260801_sprint15_centro_operacoes.sql"),
  "utf8",
);
for (const t of [
  "oficina_recursos",
  "operacao_alertas",
  "dashboard_usuario_preferencias",
  "idx_ordens_servico_tenant_status_abertas",
]) {
  if (mig.includes(t)) ok(`migration has ${t}`);
  else bad(`migration missing ${t}`);
}

const mig02 = readFileSync(
  resolve(root, "supabase/migrations/20260802_gate2_recursos_alertas.sql"),
  "utf8",
);
for (const t of [
  "os_vincular_recurso_atomico",
  "oficina_recurso_eventos",
  "operacao_alerta_eventos",
  "chave_unica",
]) {
  if (mig02.includes(t)) ok(`gate2 has ${t}`);
  else bad(`gate2 missing ${t}`);
}

console.log(`\nResultado: ${okCount} ok, ${failCount} fail\n`);
process.exit(failCount > 0 ? 1 : 0);
