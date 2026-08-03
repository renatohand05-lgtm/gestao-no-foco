#!/usr/bin/env node
/**
 * Sprint 30.7 — RBAC automacoes.* no catálogo e role visualizacao.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { PERMISSION_CATALOG, ALL_PERMISSION_KEYS } from "../lib/rbac/permissions.ts";
import { ROLE_PERMISSIONS } from "../lib/rbac/role-permissions.ts";
import { AUTOMATION_PERMISSIONS } from "../lib/automacoes/guards.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
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

console.log("\nPhase 30.7 — automation RBAC\n");

const catalogKeys = PERMISSION_CATALOG.map((p) => p.key);
const automacoesInCatalog = catalogKeys.filter((k) => k.startsWith("automacoes."));

check("PERMISSION_CATALOG automacoes >= 12", automacoesInCatalog.length >= 12);
check(
  "automacoes.visualizar no catálogo",
  catalogKeys.includes("automacoes.visualizar"),
);
check("automacoes.simular no catálogo", catalogKeys.includes("automacoes.simular"));
check("automacoes.aprovar no catálogo", catalogKeys.includes("automacoes.aprovar"));
check("automacoes.administrar no catálogo", catalogKeys.includes("automacoes.administrar"));

for (const p of AUTOMATION_PERMISSIONS) {
  check(`AUTOMATION_PERMISSIONS ${p} no catálogo`, catalogKeys.includes(p));
  check(`ALL_PERMISSION_KEYS ${p}`, ALL_PERMISSION_KEYS.includes(p));
}

const visualizacao = ROLE_PERMISSIONS.visualizacao ?? [];
check("role visualizacao inclui automacoes.visualizar", visualizacao.includes("automacoes.visualizar"));
check(
  "role visualizacao inclui automacoes.ver_historico",
  visualizacao.includes("automacoes.ver_historico"),
);
check(
  "role visualizacao não inclui automacoes.executar",
  !visualizacao.includes("automacoes.executar"),
);

const nav = readFileSync(join(root, "config/navigation.ts"), "utf8");
check("navigation automacoes.visualizar", nav.includes("automacoes.visualizar"));

const actions = readFileSync(join(root, "lib/automacoes/actions.ts"), "utf8");
check("actions.ts checa automacoes.simular", actions.includes("automacoes.simular"));
check("actions.ts checa automacoes.aprovar", actions.includes("automacoes.aprovar"));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
