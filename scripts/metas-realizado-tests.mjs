#!/usr/bin/env node
/**
 * Testes da regra de meta × realizado (lib/metas/metas-realizado).
 * Node com --experimental-strip-types.
 */
import { resumirMetas, statusDaMeta } from "../lib/metas/metas-realizado.ts";

let pass = 0;
let fail = 0;

function assert(cond, msg) {
  if (cond) {
    pass++;
  } else {
    fail++;
    console.error("FALHOU:", msg);
  }
}

const HOJE = "2026-11-17";
const linha = (competencia, meta, realizado, carros = 0) => ({ competencia, meta, realizado, carros });

// Situação do mês
assert(statusDaMeta(linha("2026-10-01", null, 1000), HOJE) === "sem_meta", "sem meta cadastrada");
assert(statusDaMeta(linha("2026-10-01", 138000, 138000), HOJE) === "batida", "meta batida exata");
assert(statusDaMeta(linha("2026-10-01", 138000, 105335.99), HOJE) === "abaixo", "outubro fechado com 76% = abaixo");
assert(statusDaMeta(linha("2026-09-01", 100000, 96000), HOJE) === "atencao", "96% de mês fechado = atenção");
assert(statusDaMeta(linha("2026-09-01", 100000, 95000), HOJE) === "atencao", "95% exato ainda é atenção");
assert(statusDaMeta(linha("2026-09-01", 100000, 94999), HOJE) === "abaixo", "menos de 95% = abaixo");
assert(statusDaMeta(linha("2026-11-01", 152000, 47855.37), HOJE) === "em_andamento", "mês corrente abaixo = em andamento");
assert(statusDaMeta(linha("2026-11-01", 152000, 160000), HOJE) === "batida", "mês corrente acima = batida");
assert(statusDaMeta(linha("2026-12-01", 162000, 0), HOJE) === "a_comecar", "mês futuro sem lançamento");
assert(statusDaMeta(linha("2026-12-01", 162000, 1000), HOJE) === "em_andamento", "mês futuro com lançamento");
assert(statusDaMeta(linha("2026-12-01", 0, 0), HOJE) === "sem_meta", "meta zero = sem meta");

// Resumo do trimestre (4T/26 da Bem Vindo Car)
const q4 = [
  linha("2026-10-01", 138000, 105335.99, 62),
  linha("2026-11-01", 152000, 47855.37, 31),
  linha("2026-12-01", 162000, 0, 0),
];
const r = resumirMetas(q4);
assert(r.meta === 452000, "meta do 4T = 452.000");
assert(Math.abs(r.realizado - 153191.36) < 0.005, "realizado do 4T = 153.191,36");
assert(Math.abs(r.falta - 298808.64) < 0.005, "falta = 298.808,64");
assert(Math.abs(r.atingido - 0.33892) < 0.0001, "33,9% da meta");
assert(r.carros === 93, "93 carros");

// Mês sem meta não entra na conta
const misto = resumirMetas([linha("2026-08-01", null, 109679.39, 77), ...q4]);
assert(misto.meta === 452000 && Math.abs(misto.realizado - 153191.36) < 0.005, "mês sem meta fica fora");
assert(resumirMetas([]).atingido === null, "vazio = sem percentual");

console.log(`metas-realizado: ${pass} ok, ${fail} falhas`);
process.exit(fail ? 1 : 0);
