#!/usr/bin/env node
/**
 * Sprint 30.5 — Score comercial determinístico.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { COMMERCIAL_SCORE_CONFIG } from "../config/crm/commercial-score.ts";

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

/** Espelho mínimo das regras (mesmos pesos/faixas da config). */
function scoreOf(input) {
  const c = COMMERCIAL_SCORE_CONFIG;
  const w = c.weights;
  const days = input.daysWithoutContact ?? 45;
  let contactRatio = 0.1;
  for (const b of c.daysWithoutContactBands) {
    if (days <= b.maxDays) {
      contactRatio = b.ratio;
      break;
    }
  }
  const valor = input.valorEstimado ?? 0;
  const valueBands = [...c.valueBands].sort((a, b) => b.minValue - a.minValue);
  let valueRatio = 0.15;
  for (const b of valueBands) {
    if (valor >= b.minValue) {
      valueRatio = b.ratio;
      break;
    }
  }
  const stageRatio = c.stageRatios[input.stage ?? "lead"] ?? 0.35;
  const histRatio = Math.min(1, Math.max(0, input.historicoCount / 5));
  const actRatio = Math.min(1, Math.max(0, input.atividadeCount / 8));
  let originRatio = c.defaultOriginRatio;
  const originKey = (input.origem ?? "").toLowerCase();
  for (const [k, r] of Object.entries(c.originRatios)) {
    if (originKey.includes(k)) {
      originRatio = r;
      break;
    }
  }
  const total = Math.round(
    w.tempo_sem_contato * contactRatio +
      w.valor * valueRatio +
      w.etapa * stageRatio +
      w.historico * (0.2 + 0.8 * histRatio) +
      w.atividade * (0.15 + 0.85 * actRatio) +
      w.origem * originRatio,
  );
  return Math.min(100, Math.max(0, total));
}

console.log("Phase 30.5 — score\n");

check("config existe", existsSync(resolve("config/crm/commercial-score.ts")));
check("lib score existe", existsSync(resolve("lib/crm/premium/commercial-score.ts")));
const weights = Object.values(COMMERCIAL_SCORE_CONFIG.weights);
check("pesos somam 100", weights.reduce((a, b) => a + b, 0) === 100);

const hot = scoreOf({
  daysWithoutContact: 1,
  valorEstimado: 60_000,
  stage: "negociacao",
  historicoCount: 5,
  atividadeCount: 8,
  origem: "indicacao",
});
const cold = scoreOf({
  daysWithoutContact: 90,
  valorEstimado: 0,
  stage: "perdido",
  historicoCount: 0,
  atividadeCount: 0,
  origem: null,
});
check("score hot alto", hot >= 70);
check("score frio menor que hot", cold < hot);
check("score bounded", hot <= 100 && cold >= 0);

const src = readFileSync(resolve("lib/crm/premium/commercial-score.ts"), "utf8");
check("usa config", /COMMERCIAL_SCORE_CONFIG/.test(src));
check("sem IA inventada", !/openai|gpt|llm|alucin/i.test(src));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
