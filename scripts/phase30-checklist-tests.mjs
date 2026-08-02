#!/usr/bin/env node
/**
 * Sprint 30.3 — checklist de implantação.
 */
import {
  IMPLANTATION_CHECKLIST,
  implantationProgressPct,
} from "../config/onboarding/implantation-checklist.ts";

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

console.log("Phase 30.3 — checklist\n");

const requiredIds = [
  "empresa_criada",
  "usuarios",
  "equipe",
  "produtos",
  "servicos",
  "clientes",
  "financeiro",
  "contas_bancarias",
  "centro_custo",
  "metas",
  "primeira_venda",
  "primeiro_relatorio",
  "primeiro_dre",
];

check("13 itens", IMPLANTATION_CHECKLIST.length === 13);
for (const id of requiredIds) {
  check(`item ${id}`, IMPLANTATION_CHECKLIST.some((i) => i.id === id));
}

check("progresso 0%", implantationProgressPct([]) === 0);
check(
  "progresso parcial",
  implantationProgressPct(["empresa_criada", "produtos"]) > 0 &&
    implantationProgressPct(["empresa_criada", "produtos"]) < 100,
);
check(
  "progresso 100%",
  implantationProgressPct(IMPLANTATION_CHECKLIST.map((i) => i.id)) === 100,
);
check(
  "todos têm hrefSuffix",
  IMPLANTATION_CHECKLIST.every((i) => i.hrefSuffix.startsWith("/")),
);
check(
  "núcleo mínimo marcado",
  IMPLANTATION_CHECKLIST.some((i) => i.core) &&
    IMPLANTATION_CHECKLIST.some((i) => !i.core),
);

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
