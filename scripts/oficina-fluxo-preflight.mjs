/**
 * Sprint 14 Adendo — Fluxo integrado oficina (preflight offline).
 * Uso: npm run test:oficina
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd());

const requiredFiles = [
  "supabase/migrations/20260728_oficina_fluxo_integrado.sql",
  "supabase/migrations/20260729_venda_pagamentos_multiplos.sql",
  "supabase/migrations/20260730_os_dashboard_itens_exclusao.sql",
  "supabase/migrations/20260731_fix_faturar_receber_min_uuid.sql",
  "lib/ordens/os-abrir-rpc.ts",
  "lib/ordens/os-dashboard-service.ts",
  "lib/dashboard/operacional-overview-service.ts",
  "components/dashboard/dashboard-operacional-strip.tsx",
  "components/ordens/os-confirm-dialog.tsx",
  "lib/vendas/venda-rapida-service.ts",
  "lib/vendas/venda-rapida-actions.ts",
  "lib/vendas/venda-rapida-validations.ts",
  "lib/vendas/vendas-dashboard-service.ts",
  "lib/descontos/desconto-service.ts",
  "lib/descontos/desconto-dashboard-service.ts",
  "lib/permissoes/constants.ts",
  "lib/permissoes/permission-service.ts",
  "lib/crm/cliente-recorrencia-service.ts",
  "components/ordens/os-open-form.tsx",
  "components/ordens/os-desconto-panel.tsx",
  "components/ordens/os-subnav.tsx",
  "components/ordens/os-item-catalog-picker.tsx",
  "components/ordens/os-orcamento-itens-panel.tsx",
  "components/ordens/os-lifecycle-menu.tsx",
  "components/vendas/venda-rapida-form.tsx",
  "app/(app)/[tenant]/vendas/rapida/page.tsx",
  "app/(app)/[tenant]/vendas/dashboard/page.tsx",
  "app/(app)/[tenant]/descontos/dashboard/page.tsx",
  "app/(app)/[tenant]/descontos/aprovacoes/page.tsx",
  "app/(app)/[tenant]/ordens/dashboard/page.tsx",
  "lib/vendas/venda-pagamento-service.ts",
  "lib/descontos/desconto-aprovacao-actions.ts",
  "docs/architecture/OFICINA_FLUXO_INTEGRADO_14.md",
];

let pass = 0;
let fail = 0;

function ok(msg) {
  pass += 1;
  console.log(`  OK  ${msg}`);
}

function bad(msg) {
  fail += 1;
  console.error(` FAIL ${msg}`);
}

console.log("Oficina fluxo integrado — preflight\n");

for (const rel of requiredFiles) {
  if (existsSync(resolve(root, rel))) ok(rel);
  else bad(`missing: ${rel}`);
}

const migration = readFileSync(
  resolve(root, "supabase/migrations/20260728_oficina_fluxo_integrado.sql"),
  "utf8",
);

for (const fn of [
  "abrir_os_com_cliente_atomico",
  "ensure_consumidor_balcao",
  "seed_desconto_alcadas_padrao",
  "seed_role_permissions_padrao",
]) {
  if (migration.includes(`function public.${fn}`)) ok(`RPC ${fn}`);
  else bad(`missing RPC ${fn}`);
}

for (const table of [
  "desconto_alcadas",
  "desconto_eventos",
  "venda_devolucoes",
  "tenant_role_permissions",
]) {
  if (migration.includes(`create table if not exists public.${table}`)) {
    ok(`table ${table}`);
  } else {
    bad(`missing table ${table}`);
  }
}

const mig29 = readFileSync(
  resolve(root, "supabase/migrations/20260729_venda_pagamentos_multiplos.sql"),
  "utf8",
);
if (mig29.includes("create table if not exists public.venda_pagamentos")) {
  ok("table venda_pagamentos (20260729)");
} else {
  bad("missing table venda_pagamentos in 20260729");
}
if (mig29.includes("faturar_venda_com_pagamentos_atomico")) {
  ok("RPC faturar_venda_com_pagamentos_atomico");
} else {
  bad("missing RPC faturar_venda_com_pagamentos_atomico");
}

const openForm = readFileSync(
  resolve(root, "components/ordens/os-open-form.tsx"),
  "utf8",
);
if (openForm.includes("novo_cliente") && openForm.includes("searchClientesOsAction")) {
  ok("OS form: busca + novo cliente");
} else {
  bad("OS form missing integrated modes");
}

const perm = readFileSync(resolve(root, "lib/permissoes/constants.ts"), "utf8");
for (const key of [
  "venda_rapida.criar",
  "desconto.aplicar",
  "desconto.aprovar",
  "venda.devolver",
  "os.criar_cliente_forcado",
  "os.visualizar_dashboard",
  "os.adicionar_item_personalizado",
  "os.cancelar",
  "os.arquivar",
  "os.excluir_rascunho",
  "vendas.visualizar_dashboard",
]) {
  if (perm.includes(`"${key}"`)) ok(`permission ${key}`);
  else bad(`missing permission ${key}`);
}

const mig31 = readFileSync(
  resolve(root, "supabase/migrations/20260731_fix_faturar_receber_min_uuid.sql"),
  "utf8",
);
if (
  mig31.includes("faturar_e_receber_venda_atomico") &&
  mig31.includes("order by cr.created_at") &&
  mig31.includes("limit 1") &&
  !/select\s+count\(\*\)\s*,\s*min\s*\(/i.test(mig31)
) {
  ok("fix min(uuid) em faturar_e_receber");
} else {
  bad("missing fix min(uuid) in 20260731");
}

const mig30 = readFileSync(
  resolve(root, "supabase/migrations/20260730_os_dashboard_itens_exclusao.sql"),
  "utf8",
);
for (const rpc of [
  "os_excluir_rascunho_atomico",
  "os_cancelar_atomico",
  "os_arquivar_atomico",
  "os_restaurar_atomico",
]) {
  if (mig30.includes(`function public.${rpc}`)) ok(`RPC ${rpc}`);
  else bad(`missing RPC ${rpc}`);
}
if (mig30.includes("is_personalizado")) ok("column is_personalizado");
else bad("missing is_personalizado");
if (mig30.includes("arquivado_em")) ok("column arquivado_em");
else bad("missing arquivado_em");

console.log(`\nResultado: ${pass} ok, ${fail} fail`);
process.exit(fail > 0 ? 1 : 0);
