#!/usr/bin/env node
/**
 * Testes da regra única de vigência × competência (lib/mecanicos/vigencia.ts).
 * Node com --experimental-strip-types.
 */
import {
  firstDayOfCompetencia,
  lastDayOfCompetencia,
  pickCustoParaCompetencia,
  vigenciaContemData,
  vigenciasConflitam,
  vigenciaSobrepoeCompetencia,
} from "../lib/mecanicos/vigencia.ts";

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

console.log("\nMecânicos — vigência × competência\n");

assert(firstDayOfCompetencia("2026-07") === "2026-07-01", "firstDay YYYY-MM");
assert(firstDayOfCompetencia("2026-07-15") === "2026-07-01", "firstDay YYYY-MM-DD");
assert(lastDayOfCompetencia("2026-07") === "2026-07-31", "lastDay julho");
assert(lastDayOfCompetencia("2026-02") === "2026-02-28", "lastDay fev 2026");

// 1) início no primeiro dia do mês
assert(
  vigenciaSobrepoeCompetencia(
    { vigencia_inicio: "2026-07-01", vigencia_fim: null },
    "2026-07",
  ),
  "vigência no dia 1 cobre competência",
);

// 2) início no meio do mês (bug original)
assert(
  vigenciaSobrepoeCompetencia(
    { vigencia_inicio: "2026-07-20", vigencia_fim: null },
    "2026-07",
  ),
  "vigência no meio do mês cobre competência",
);

// 3) encerrada no meio do mês
assert(
  vigenciaSobrepoeCompetencia(
    { vigencia_inicio: "2026-06-01", vigencia_fim: "2026-07-15" },
    "2026-07",
  ),
  "vigência encerrada no meio do mês ainda cobre",
);

// 4) fora da competência
assert(
  !vigenciaSobrepoeCompetencia(
    { vigencia_inicio: "2026-08-01", vigencia_fim: null },
    "2026-07",
  ),
  "vigência fora (depois) não cobre",
);

// 5) sem data final
assert(
  vigenciaSobrepoeCompetencia(
    { vigencia_inicio: "2025-01-10", vigencia_fim: null },
    "2026-07",
  ),
  "vigência aberta (NULL fim) cobre mês futuro",
);

// 6) competência anterior ao início
assert(
  !vigenciaSobrepoeCompetencia(
    { vigencia_inicio: "2026-07-20", vigencia_fim: null },
    "2026-06",
  ),
  "competência anterior ao início não cobre",
);

// 7) competência posterior ao fim
assert(
  !vigenciaSobrepoeCompetencia(
    { vigencia_inicio: "2026-01-01", vigencia_fim: "2026-06-30" },
    "2026-07",
  ),
  "competência posterior ao fim não cobre",
);

// Regra antiga (errada) vs nova
assert(
  !("2026-07-20" <= "2026-07-01"),
  "sanity: regra antiga (inicio <= dia1) falharia no meio do mês",
);

// pickCustoParaCompetencia
const custos = [
  { id: "a", vigencia_inicio: "2026-01-01", vigencia_fim: "2026-06-30" },
  { id: "b", vigencia_inicio: "2026-07-15", vigencia_fim: null },
];
assert(
  pickCustoParaCompetencia(custos, "2026-07")?.id === "b",
  "pick escolhe vigência que sobrepõe julho",
);
assert(
  pickCustoParaCompetencia(custos, "2026-03")?.id === "a",
  "pick escolhe vigência de março",
);
assert(
  pickCustoParaCompetencia(custos, "2025-12") == null,
  "pick null quando fora",
);

// conflito de vigências
assert(
  vigenciasConflitam(
    { vigencia_inicio: "2026-07-01", vigencia_fim: null },
    { vigencia_inicio: "2026-07-20", vigencia_fim: null },
  ),
  "duas abertas conflitam",
);
assert(
  !vigenciasConflitam(
    { vigencia_inicio: "2026-01-01", vigencia_fim: "2026-06-30" },
    { vigencia_inicio: "2026-07-01", vigencia_fim: null },
  ),
  "adjacentes não conflitam",
);

// dia específico (apontamento) — sem mudar
assert(
  vigenciaContemData(
    { vigencia_inicio: "2026-07-20", vigencia_fim: null },
    "2026-07-20",
  ),
  "contemData no início",
);
assert(
  !vigenciaContemData(
    { vigencia_inicio: "2026-07-20", vigencia_fim: null },
    "2026-07-19",
  ),
  "contemData antes do início = false",
);

// duplicidade lógica (simulação da unique key tenant+mec+comp+tipo)
const obrigacoes = new Set();
function tentarGerar(key) {
  if (obrigacoes.has(key)) return false;
  obrigacoes.add(key);
  return true;
}
assert(tentarGerar("t1|m1|2026-07-01|folha"), "primeira obrigação ok");
assert(!tentarGerar("t1|m1|2026-07-01|folha"), "obrigação duplicada bloqueada");

console.log(`\nResult: PASS=${pass} FAIL=${fail}\n`);
process.exit(fail > 0 ? 1 : 0);
