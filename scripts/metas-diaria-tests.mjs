#!/usr/bin/env node
/**
 * Testes de meta diária (rateio / override / status).
 */
import { resolveMetaDiaria, rateioMetaMensalPorDiaUtil, countWeekdaysInMonth } from "../lib/metas/meta-diaria.ts";
import {
  calcPercentualAtingido,
  classifyMetaDiaStatus,
} from "../lib/dashboard/faturamento-agregacao.ts";

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

console.log("\nMetas — diária / mensal\n");

const uteis = countWeekdaysInMonth(2026, 6);
assert(uteis === 23, `jul/2026 tem 23 dias úteis (got ${uteis})`);

const rateio = rateioMetaMensalPorDiaUtil(75000, "2026-07-01");
assert(
  Math.abs(rateio - 75000 / 23) < 0.0001,
  "rateio meta mensal / dias úteis",
);

const dia = resolveMetaDiaria({
  competencia: "2026-07-01",
  valorMetaMensal: 75000,
  data: "2026-07-20",
});
assert(dia.fonte === "rateio", "fonte rateio");
assert(Math.abs(dia.meta_diaria - rateio) < 0.0001, "meta diária = rateio");

const pct = calcPercentualAtingido(1000, dia.meta_diaria);
assert(pct != null && pct > 0 && pct < 100, "percentual parcial do dia");
assert(classifyMetaDiaStatus(pct, dia.meta_diaria) === "abaixo", "status abaixo com ritmo baixo");

const manual = resolveMetaDiaria({
  competencia: "2026-07-01",
  valorMetaMensal: 75000,
  data: "2026-07-20",
  override: { data: "2026-07-20", valor_meta: 3000 },
});
assert(manual.meta_diaria === 3000, "override manual por data");

const fechado = resolveMetaDiaria({
  competencia: "2026-07-01",
  valorMetaMensal: 75000,
  data: "2026-07-20",
  diaFechado: true,
});
assert(fechado.fonte === "zero_fechado", "dia fechado");
assert(fechado.meta_diaria === 0, "meta 0 em dia fechado");

console.log(`\nResultado: ${pass} PASS / ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
