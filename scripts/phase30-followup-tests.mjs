#!/usr/bin/env node
/**
 * Sprint 30.5 — Follow-up buckets Premium.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { groupPremiumFollowUps } from "../lib/crm/premium/follow-up-buckets.ts";

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

console.log("Phase 30.5 — follow-up\n");

const hoje = "2026-08-02";
const items = [
  {
    id: "1",
    tipo: "ligar",
    titulo: "Atrasado",
    clienteId: "c1",
    clienteNome: "A",
    responsavelId: "u1",
    dataRef: "2026-08-01",
    status: "pendente",
    origem: "tarefa",
  },
  {
    id: "2",
    tipo: "ligar",
    titulo: "Hoje",
    clienteId: "c2",
    clienteNome: "B",
    responsavelId: "u1",
    dataRef: "2026-08-02",
    status: "pendente",
    origem: "tarefa",
  },
  {
    id: "3",
    tipo: "ligar",
    titulo: "Amanhã",
    clienteId: "c3",
    clienteNome: "C",
    responsavelId: "u1",
    dataRef: "2026-08-03",
    status: "pendente",
    origem: "tarefa",
  },
  {
    id: "4",
    tipo: "ligar",
    titulo: "Sem resp",
    clienteId: "c4",
    clienteNome: "D",
    responsavelId: null,
    dataRef: "2026-08-04",
    status: "pendente",
    origem: "tarefa",
  },
  {
    id: "5",
    tipo: "ligar",
    titulo: "Sem data",
    clienteId: "c5",
    clienteNome: "E",
    responsavelId: "u1",
    dataRef: "",
    status: "pendente",
    origem: "tarefa",
  },
  {
    id: "6",
    tipo: "ligar",
    titulo: "Done",
    clienteId: "c6",
    clienteNome: "F",
    responsavelId: "u1",
    dataRef: "2026-08-01",
    status: "concluida",
    origem: "tarefa",
  },
];

const g = groupPremiumFollowUps(items, hoje);
check("atrasados", g.atrasados.length === 1);
check("hoje", g.hoje.length === 1);
check("amanha", g.amanha.length === 1);
check("sem_responsavel", g.sem_responsavel.length === 1);
check("sem_data", g.sem_data.length === 1);
check("concluida ignorada", !Object.values(g).flat().some((i) => i.id === "6"));

check("panel UI", existsSync(resolve("components/crm/premium/follow-up-panel.tsx")));
const actions = readFileSync(resolve("lib/crm/actions.ts"), "utf8");
check("patch action", /patchClienteTarefaAction/.test(actions));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
