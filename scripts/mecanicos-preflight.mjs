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

console.log("\nMecânicos / custo / OS / DRE — preflight\n");

const required = [
  "supabase/migrations/20260803_mecanicos_custo_os_dre.sql",
  "supabase/migrations/20260804_fix_vigencia_competencia_mecanico.sql",
  "supabase/migrations/20260805_backfill_mecanico_custo_classificacao.sql",
  "lib/mecanicos/constants.ts",
  "lib/mecanicos/vigencia.ts",
  "lib/mecanicos/classificacao.ts",
  "lib/mecanicos/mecanico-service.ts",
  "lib/mecanicos/custo-service.ts",
  "lib/mecanicos/competencia-service.ts",
  "lib/mecanicos/os-mecanico-service.ts",
  "lib/mecanicos/apontamento-service.ts",
  "lib/mecanicos/actions.ts",
  "components/mecanicos/mecanicos-manager.tsx",
  "components/mecanicos/mecanico-detail-panel.tsx",
  "components/ordens/os-mecanico-binder.tsx",
  "app/(app)/[tenant]/oficina/mecanicos/page.tsx",
  "app/(app)/[tenant]/oficina/mecanicos/[id]/page.tsx",
];

for (const f of required) {
  if (existsSync(resolve(root, f))) ok(f);
  else bad(`missing ${f}`);
}

const nav = readFileSync(resolve(root, "config/navigation.ts"), "utf8");
if (nav.includes("oficina/mecanicos") && nav.includes("Mecânicos")) {
  ok("nav Mecânicos");
} else bad("nav missing Mecânicos");

const perm = readFileSync(resolve(root, "lib/permissoes/constants.ts"), "utf8");
for (const k of [
  "mecanicos.visualizar",
  "mecanicos.criar",
  "mecanicos.editar",
  "mecanicos.ver_custo",
  "mecanicos.editar_custo",
  "mecanicos.gerar_folha",
  "mecanicos.apontar_horas",
  "mecanicos.apontar_horas_manual",
  "mecanicos.visualizar_dashboard",
  "os.atribuir_mecanico",
  "os.transferir_mecanico",
  "financeiro.gerar_obrigacao_mecanico",
]) {
  if (perm.includes(`"${k}"`)) ok(`permission ${k}`);
  else bad(`missing permission ${k}`);
}

const mig = readFileSync(
  resolve(root, "supabase/migrations/20260803_mecanicos_custo_os_dre.sql"),
  "utf8",
);
for (const t of [
  "mecanicos",
  "mecanico_custos",
  "mecanico_competencias",
  "ordem_servico_mecanicos",
  "mecanico_apontamentos",
  "mecanico_auditoria",
  "tenant_mecanico_config",
  "gerar_obrigacao_mecanico_atomico",
  "os_atribuir_mecanico_atomico",
  "mecanico_apontamento_atomico",
  "mecanico_competencia_id",
  "uq_mecanico_competencia_unica",
]) {
  if (mig.includes(t)) ok(`migration has ${t}`);
  else bad(`migration missing ${t}`);
}

if (
  mig.includes("Não lança salário direto no DRE") ||
  mig.includes("conta a pagar")
) {
  ok("migration documents CAP→DRE path");
} else bad("migration missing CAP→DRE documentation");

const schema = readFileSync(
  resolve(root, "lib/schema/schema-expectations.ts"),
  "utf8",
);
for (const t of [
  "mecanicos",
  "mecanico_custos",
  "mecanico_competencias",
  "ordem_servico_mecanicos",
  "mecanico_apontamentos",
  "gerar_obrigacao_mecanico_atomico",
]) {
  if (schema.includes(`"${t}"`) || schema.includes(`name: "${t}"`)) {
    ok(`schema expectation ${t}`);
  } else bad(`schema expectation missing ${t}`);
}

const migFix = readFileSync(
  resolve(root, "supabase/migrations/20260804_fix_vigencia_competencia_mecanico.sql"),
  "utf8",
);
for (const t of [
  "fn_mecanico_custo_sobrepoe_competencia",
  "trg_mecanico_custos_sem_conflito",
  "gerar_obrigacao_mecanico_atomico",
  "1 month - 1 day",
  "sobreposicao_valor_integral",
]) {
  if (migFix.includes(t)) ok(`fix migration has ${t}`);
  else bad(`fix migration missing ${t}`);
}

const vigencia = readFileSync(resolve(root, "lib/mecanicos/vigencia.ts"), "utf8");
if (
  vigencia.includes("vigenciaSobrepoeCompetencia") &&
  vigencia.includes("lastDayOfCompetencia")
) {
  ok("shared vigencia helper");
} else bad("missing vigencia helper");

const classificacao = readFileSync(
  resolve(root, "lib/mecanicos/classificacao.ts"),
  "utf8",
);
if (
  classificacao.includes("assertClassificacaoCustoIds") &&
  classificacao.includes("isUuid")
) {
  ok("classificacao helper");
} else bad("missing classificacao helper");

const custoSvc = readFileSync(
  resolve(root, "lib/mecanicos/custo-service.ts"),
  "utf8",
);
if (
  custoSvc.includes("assertClassificacaoCustoIds") &&
  custoSvc.includes("atualizarClassificacao")
) {
  ok("custo-service validates + atualizarClassificacao");
} else bad("custo-service missing classificacao guards");

const migBackfill = readFileSync(
  resolve(
    root,
    "supabase/migrations/20260805_backfill_mecanico_custo_classificacao.sql",
  ),
  "utf8",
);
if (
  migBackfill.includes("despesas_pessoal") &&
  migBackfill.includes("ainda sem classificação")
) {
  ok("backfill migration safe + reports remaining");
} else bad("backfill migration incomplete");

console.log(`\nResult: PASS=${okCount} FAIL=${failCount}\n`);
process.exit(failCount > 0 ? 1 : 0);
