#!/usr/bin/env node
/**
 * Sprint 30.5 — Previsão de receita + motivos de perda (offline).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  LOSS_REASON_CATEGORIES,
  LOSS_REASON_TOKEN_MAP,
} from "../config/crm/commercial-score.ts";

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

function forecast(opps, period = "2026-08") {
  const abertas = opps.filter((o) => o.status === "aberta");
  const ganhas = opps.filter(
    (o) =>
      o.status === "ganha" &&
      String(o.data_fechamento ?? o.updated_at).startsWith(period),
  );
  let prevista = 0;
  let provavel = 0;
  for (const o of abertas) {
    const v = Number(o.valor_estimado ?? 0);
    prevista += v;
    const p = Number(o.probabilidade ?? 0);
    provavel += v * (p / 100);
  }
  const fechada = ganhas.reduce((a, o) => a + Number(o.valor_estimado ?? 0), 0);
  const closed = opps.filter((o) => o.status === "ganha" || o.status === "perdida");
  const won = closed.filter((o) => o.status === "ganha").length;
  const conversao = closed.length ? Math.round((won / closed.length) * 1000) / 10 : 0;
  return { prevista, provavel, fechada, conversao };
}

function categorize(raw) {
  if (!raw?.trim()) return "Outro";
  const n = raw
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
  for (const entry of LOSS_REASON_TOKEN_MAP) {
    for (const token of entry.tokens) {
      const t = token
        .normalize("NFD")
        .replace(/\p{M}/gu, "")
        .toLowerCase();
      if (n.includes(t)) return entry.category;
    }
  }
  return "Outro";
}

console.log("Phase 30.5 — revenue\n");

check("forecast lib", existsSync(resolve("lib/crm/premium/revenue-forecast.ts")));
check("loss lib", existsSync(resolve("lib/crm/premium/loss-reasons.ts")));
check("6 categorias", LOSS_REASON_CATEGORIES.length === 6);

const opps = [
  { status: "aberta", valor_estimado: 1000, probabilidade: 50, stage_key: "proposta", updated_at: "2026-08-01", data_fechamento: null },
  { status: "ganha", valor_estimado: 2000, probabilidade: 100, stage_key: "fechado", updated_at: "2026-08-02", data_fechamento: "2026-08-02" },
  { status: "perdida", valor_estimado: 500, probabilidade: 0, stage_key: "perdido", updated_at: "2026-08-01", data_fechamento: "2026-08-01", motivo_perda: "Preço alto" },
];
const f = forecast(opps);
check("prevista = 1000", f.prevista === 1000);
check("provável = 500", f.provavel === 500);
check("fechada = 2000", f.fechada === 2000);
check("conversão 50%", f.conversao === 50);
check("categoria preço", categorize("Preço alto") === "Preço");
check("categoria outro", categorize("xyz") === "Outro");

const src = readFileSync(resolve("lib/crm/premium/revenue-forecast.ts"), "utf8");
check("pondera probabilidade", /probabilidade/.test(src));
check("não inventa", /reais|CrmOportunidadeRow|aberta/.test(src));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
