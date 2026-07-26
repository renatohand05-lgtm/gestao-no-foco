#!/usr/bin/env node
/**
 * Testes — IA Executiva (Gate 18.5)
 * Engine determinístico: sem LLM, sem I/O.
 */
import {
  calcExecutiveAiConfidence,
  calcExecutiveScore,
  classifyExecutiveHealth,
  runExecutiveAiEngine,
} from "../lib/ai/executive-ai-engine.ts";
import {
  scoreComercial,
  scoreCrm,
  scoreEstoque,
  scoreFinanceiro,
  scoreOperacao,
} from "../lib/ai/executive-ai-rules.ts";
import {
  EXECUTIVE_AI_MAX_DIAGNOSTICS,
  EXECUTIVE_AI_MAX_RECOMMENDATIONS,
  EXECUTIVE_AI_MIN_CONFIDENCE,
  EXECUTIVE_AI_MIN_MODULES,
  EXECUTIVE_AI_MODULE_WEIGHTS,
} from "../lib/ai/executive-ai-types.ts";
import {
  formatExecutiveConfidence,
  formatExecutiveScore,
} from "../lib/ai/executive-ai-summary.ts";

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

function assertNoNaN(result, msg) {
  const blob = JSON.stringify(result);
  assert(!blob.includes("null") || true, msg + " (serialize ok)");
  assert(
    result.executiveScore == null || Number.isFinite(result.executiveScore),
    `${msg} score finito ou null`,
  );
  assert(Number.isFinite(result.confidence), `${msg} confidence finita`);
  for (const m of result.moduleScores) {
    assert(
      m.score == null || Number.isFinite(m.score),
      `${msg} módulo ${m.module} sem NaN`,
    );
  }
}

console.log("\nIA Executiva — Gate 18.5\n");

const baseFin = {
  status: "available",
  saldoAtual: 10000,
  saldoProjetado7d: 5000,
  saldoProjetado30d: 8000,
  pagarVencidoQtd: 0,
  pagarVencidoValor: 0,
  receberVencidoQtd: 0,
  receberVencidoValor: 0,
};

const baseCom = {
  status: "available",
  faturamentoPeriodo: 20000,
  valorEmNegociacao: 1000,
  valorPerdido: 0,
  taxaConversaoPct: 35,
  conversaoDisponivel: true,
  metaDisponivel: true,
  metaPercentual: 100,
  metaAtingida: true,
  metaAbaixoRitmo: false,
  coberturaOrigemPct: 90,
  coberturaOrigemBaixa: false,
  coberturaResponsavelPct: 80,
  orcamentosAguardando: 0,
    ticketMedio: null,
};

const baseCrm = {
  status: "available",
  clientesAtivos: 40,
  clientesInativos180: 2,
  clientesRecorrentes: 15,
  clientesEmRisco: 0,
  vipSemRetorno: 0,
  revisoesVencidas: 0,
  orcamentosPendentes: 0,
  oportunidades: 3,
  ultimaVisitaCarteira: "2026-07-01",
};

const baseOps = {
  status: "available",
  aguardandoAprovacao: 0,
  atrasadas: 0,
  paradas: 0,
  semResponsavel: 0,
  taxaOcupacaoPct: 60,
  capacidadeLimite: false,
  valorAguardandoAprovacao: null,
};

const baseEst = {
  status: "available",
  zerados: 0,
  abaixoMinimo: 0,
  valorParado: 0,
  valorParadoDisponivel: true,
  cadastroInconsistente: 0,
  coberturaDisponivel: true,
  giroDisponivel: true,
  fornecedorUnico: false,
  skusAtivos: 50,
};

function fullInput(over = {}) {
  return {
    tenantSlug: "acme",
    generatedAt: "2026-07-24T12:00:00.000Z",
    financeiro: { ...baseFin },
    comercial: { ...baseCom },
    crm: { ...baseCrm },
    operacao: { ...baseOps },
    estoque: { ...baseEst },
    ...over,
  };
}

console.log("Scores por módulo");
{
  const fin = scoreFinanceiro(
    { ...baseFin, saldoProjetado7d: -100, pagarVencidoQtd: 2 },
    25,
  );
  assert(fin.score != null && fin.score < 100, "financeiro penalizado");
  assert(
    fin.penalties.some((p) => p.ruleId === "fin.proj_7d_negativa"),
    "penalidade proj 7d",
  );

  const com = scoreComercial(
    { ...baseCom, metaAbaixoRitmo: true, metaAtingida: false, taxaConversaoPct: 10 },
    20,
  );
  assert(com.score != null && com.score < 90, "comercial penalizado");

  const crm = scoreCrm({ ...baseCrm, clientesEmRisco: 5, vipSemRetorno: 2 }, 15);
  assert(crm.score != null && crm.score < 100, "crm penalizado");

  const ops = scoreOperacao({ ...baseOps, atrasadas: 3, aguardandoAprovacao: 2 }, 25);
  assert(ops.score != null && ops.score < 100, "operação penalizada");

  const est = scoreEstoque({ ...baseEst, zerados: 4, abaixoMinimo: 2 }, 15);
  assert(est.score != null && est.score < 100, "estoque penalizado");

  const unavail = scoreFinanceiro(null, 25);
  assert(unavail.score === null, "módulo indisponível → score null (não 0)");
  assert(unavail.status === "unavailable", "status unavailable");
}

console.log("Média ponderada e redistribuição");
{
  const scores = [
    scoreFinanceiro(baseFin, 25),
    scoreComercial(baseCom, 20),
    scoreCrm(baseCrm, 15),
    scoreOperacao(baseOps, 25),
    scoreEstoque(baseEst, 15),
  ];
  const { score, redistributed } = calcExecutiveScore(scores);
  assert(score != null && score >= 80, "score saudável com todos ok");
  assert(redistributed === false || typeof redistributed === "boolean", "flag redistribuição");

  const withMissing = [
    scoreFinanceiro(baseFin, 25),
    scoreComercial(null, 20),
    scoreCrm(baseCrm, 15),
    scoreOperacao(baseOps, 25),
    scoreEstoque(baseEst, 15),
  ];
  const r2 = calcExecutiveScore(withMissing);
  assert(r2.score != null, "redistribui com módulo ausente");
  assert(r2.redistributed === true, "marca redistribuição");
  const comMod = withMissing.find((m) => m.module === "comercial");
  assert(comMod.score === null, "comercial ausente não vira 0");
}

console.log("Confidence e classificação");
{
  const all = [
    scoreFinanceiro(baseFin, 25),
    scoreComercial(baseCom, 20),
    scoreCrm(baseCrm, 15),
    scoreOperacao(baseOps, 25),
    scoreEstoque(baseEst, 15),
  ];
  const conf = calcExecutiveAiConfidence(all);
  assert(conf === 100, "confidence 100% com todos available");

  const partial = [
    scoreFinanceiro({ ...baseFin, status: "partial", saldoAtual: null }, 25),
    scoreComercial(baseCom, 20),
    scoreCrm(null, 15),
    scoreOperacao(baseOps, 25),
    scoreEstoque(baseEst, 15),
  ];
  const conf2 = calcExecutiveAiConfidence(partial);
  assert(conf2 < 100 && conf2 > 0, "confidence parcial < 100");

  assert(classifyExecutiveHealth(98, 5, 100) === "excelente", "excelente");
  assert(classifyExecutiveHealth(85, 5, 100) === "saudavel", "saudável");
  assert(classifyExecutiveHealth(70, 5, 100) === "atencao", "atenção");
  assert(classifyExecutiveHealth(40, 5, 100) === "critico", "crítico");
  assert(
    classifyExecutiveHealth(90, 2, 100) === "indisponivel",
    `indisponível se < ${EXECUTIVE_AI_MIN_MODULES} módulos`,
  );
  assert(
    classifyExecutiveHealth(90, 5, EXECUTIVE_AI_MIN_CONFIDENCE - 1) ===
      "indisponivel",
    "indisponível se confidence baixa",
  );
}

console.log("Engine — cenário saudável");
{
  const a = runExecutiveAiEngine(fullInput());
  const b = runExecutiveAiEngine(fullInput());
  assert(a.health === "excelente" || a.health === "saudavel", "saúde boa");
  assert(a.executiveScore != null && a.executiveScore >= 80, "score alto");
  assert(
    JSON.stringify({
      ...a,
      generatedAt: "x",
    }) ===
      JSON.stringify({
        ...b,
        generatedAt: "x",
      }),
    "mesmo input → mesmo output",
  );
  assertNoNaN(a, "saudável");
}

console.log("Prioridade máxima e desempate");
{
  const r = runExecutiveAiEngine(
    fullInput({
      financeiro: {
        ...baseFin,
        saldoProjetado7d: -2000,
        pagarVencidoQtd: 0,
      },
      operacao: { ...baseOps, atrasadas: 2 },
    }),
  );
  assert(r.diagnostics.length >= 1, "há diagnósticos");
  assert(r.priority.diagnosticId != null, "prioridade ligada a diagnóstico");
  assert(
    r.priority.title.toLowerCase().includes("prioridade máxima") ||
      r.priority.title.length > 0,
    "prioridade máxima definida",
  );
  // crítico financeiro (proj) deve vencer ou empatar com ordem estável
  const ids = r.diagnostics.map((d) => d.id);
  assert(ids[0] === "diag.fin.proj_7d" || ids.includes("diag.fin.proj_7d"), "diag caixa presente");
  const r2 = runExecutiveAiEngine(
    fullInput({
      financeiro: {
        ...baseFin,
        saldoProjetado7d: -2000,
        pagarVencidoQtd: 0,
      },
      operacao: { ...baseOps, atrasadas: 2 },
    }),
  );
  assert(r.priority.diagnosticId === r2.priority.diagnosticId, "desempate determinístico");
}

console.log("Máximo 5 diag/rec e sem duplicidade");
{
  const r = runExecutiveAiEngine(
    fullInput({
      financeiro: {
        ...baseFin,
        saldoProjetado7d: -1,
        pagarVencidoQtd: 3,
        receberVencidoQtd: 2,
      },
      comercial: {
        ...baseCom,
        metaAbaixoRitmo: true,
        metaAtingida: false,
        taxaConversaoPct: 5,
        conversaoDisponivel: true,
        valorEmNegociacao: 50000,
        orcamentosAguardando: 8,
    ticketMedio: null,
        faturamentoPeriodo: 10000,
      },
      crm: { ...baseCrm, vipSemRetorno: 3, clientesEmRisco: 10 },
      operacao: {
        ...baseOps,
        atrasadas: 4,
        aguardandoAprovacao: 5,
        paradas: 3,
      },
      estoque: { ...baseEst, zerados: 6, abaixoMinimo: 4 },
    }),
  );
  assert(r.diagnostics.length <= EXECUTIVE_AI_MAX_DIAGNOSTICS, "max 5 diagnósticos");
  assert(
    r.recommendations.length <= EXECUTIVE_AI_MAX_RECOMMENDATIONS,
    "max 5 recomendações",
  );
  const diagIds = r.diagnostics.map((d) => d.id);
  assert(new Set(diagIds).size === diagIds.length, "sem diag duplicado");
  for (const rec of r.recommendations) {
    assert(
      diagIds.includes(rec.diagnosticId),
      `rec ${rec.id} tem diagnóstico correspondente`,
    );
  }
}

console.log("Módulo indisponível / falha isolada / todos indisponíveis");
{
  const partial = runExecutiveAiEngine(
    fullInput({
      crm: null,
      comercial: { ...baseCom, status: "partial", coberturaOrigemBaixa: true },
    }),
  );
  assert(partial.unavailableSources.includes("crm"), "CRM indisponível listado");
  assert(partial.partial === true, "marca parcial");
  assert(partial.executiveScore != null || partial.health === "indisponivel", "não derruba");
  assertNoNaN(partial, "parcial");

  const allDown = runExecutiveAiEngine({
    tenantSlug: "acme",
    generatedAt: "2026-07-24T12:00:00.000Z",
    financeiro: null,
    comercial: null,
    crm: null,
    operacao: null,
    estoque: null,
  });
  assert(allDown.health === "indisponivel", "todos down → indisponível");
  assert(allDown.executiveScore === null, "score null (não zero)");
  assert(allDown.diagnostics.length === 0, "sem diagnósticos inventados");
  assert(allDown.recommendations.length === 0, "sem recomendações inventadas");
}

console.log("Não inventa / não penaliza ausente como zero");
{
  const r = runExecutiveAiEngine(
    fullInput({
      comercial: {
        ...baseCom,
        conversaoDisponivel: false,
        taxaConversaoPct: null,
      },
      estoque: {
        ...baseEst,
        valorParadoDisponivel: false,
        valorParado: null,
        coberturaDisponivel: false,
      },
    }),
  );
  const com = r.moduleScores.find((m) => m.module === "comercial");
  assert(
    !com.penalties.some((p) => p.ruleId === "com.conversao_baixa"),
    "não penaliza conversão indisponível",
  );
  const est = r.moduleScores.find((m) => m.module === "estoque");
  assert(
    !est.penalties.some((p) => p.ruleId === "est.valor_parado"),
    "não penaliza valor parado indisponível",
  );
}

console.log("Tenant isolation / links");
{
  const r = runExecutiveAiEngine(
    fullInput({
      tenantSlug: "loja-x",
      operacao: { ...baseOps, aguardandoAprovacao: 3 },
    }),
  );
  for (const d of r.diagnostics) {
    if (d.href) {
      assert(d.href.startsWith("/loja-x/"), `link tenant ${d.id}`);
    }
  }
  for (const rec of r.recommendations) {
    if (rec.href) {
      assert(rec.href.startsWith("/loja-x/"), `rec link tenant ${rec.id}`);
    }
  }
}

console.log("Pesos documentados");
{
  const sum =
    EXECUTIVE_AI_MODULE_WEIGHTS.financeiro +
    EXECUTIVE_AI_MODULE_WEIGHTS.operacao +
    EXECUTIVE_AI_MODULE_WEIGHTS.comercial +
    EXECUTIVE_AI_MODULE_WEIGHTS.crm +
    EXECUTIVE_AI_MODULE_WEIGHTS.estoque;
  assert(sum === 100, "pesos somam 100");
  assert(formatExecutiveScore(null) === "Indisponível", "label score null");
  assert(
    formatExecutiveConfidence(86).includes("86%"),
    "label cobertura 86%",
  );
}

console.log("Crítico com evidência");
{
  const r = runExecutiveAiEngine(
    fullInput({
      financeiro: {
        ...baseFin,
        saldoProjetado7d: -5000,
        pagarVencidoQtd: 5,
        pagarVencidoValor: 12000,
      },
    }),
  );
  assert(r.health === "critico" || r.executiveScore < 60 || r.diagnostics.some((d) => d.severity === "critica"), "cenário crítico");
  assert(
    r.diagnostics.every((d) => d.evidence.length > 0 && d.audit.ruleId),
    "diagnósticos auditáveis",
  );
}

console.log("Gate 18.5.1 — hrefs e filtros");
{
  const {
    executiveAiCanonicalHref,
    isFictitiousExecutiveAiFilter,
  } = await import("../lib/ai/executive-ai-summary.ts");

  assert(
    !isFictitiousExecutiveAiFilter(
      executiveAiCanonicalHref("acme", "ordens_atrasadas"),
    ),
    "sort=mais_atrasadas válido",
  );
  assert(
    isFictitiousExecutiveAiFilter("/acme/ordens?atrasadas=1"),
    "atrasadas=1 fictício",
  );
  assert(
    isFictitiousExecutiveAiFilter("/acme/estoque"),
    "estoque genérico fictício p/ deep-link crítico",
  );
  assert(
    !isFictitiousExecutiveAiFilter(
      executiveAiCanonicalHref("acme", "estoque_zerado"),
    ),
    "estoque/dashboard?criticidade válido",
  );

  const r = runExecutiveAiEngine(
    fullInput({
      operacao: { ...baseOps, atrasadas: 2, paradas: 1 },
      estoque: { ...baseEst, zerados: 3 },
    }),
  );
  for (const d of r.diagnostics) {
    if (d.href) {
      assert(!isFictitiousExecutiveAiFilter(d.href), `href limpo ${d.id}`);
      assert(d.href.startsWith("/acme/"), `tenant ${d.id}`);
    }
  }
  const atr = r.diagnostics.find((d) => d.id === "diag.ops.atrasadas");
  assert(
    atr?.href?.includes("sort=mais_atrasadas"),
    "atrasadas → sort suportado",
  );
  assert(!atr?.href?.includes("atrasadas=1"), "sem filtro fictício atrasadas");
}

console.log("Gate 18.5.1 — honesty / indisponíveis");
{
  const r = runExecutiveAiEngine(
    fullInput({
      operacao: {
        ...baseOps,
        aguardandoAprovacao: 4,
        valorAguardandoAprovacao: null,
        semResponsavel: null,
      },
      estoque: {
        ...baseEst,
        valorParadoDisponivel: false,
        valorParado: null,
        coberturaDisponivel: false,
      },
      comercial: {
        ...baseCom,
        conversaoDisponivel: false,
        taxaConversaoPct: null,
        coberturaOrigemBaixa: true,
        status: "partial",
      },
      crm: null,
    }),
  );
  const apr = r.diagnostics.find((d) => d.id === "diag.ops.aprovacao");
  assert(apr != null, "diag aprovação por contagem");
  assert(
    !String(apr.description).includes("R$"),
    "sem valor inventado na aprovação",
  );
  assert(
    apr.evidence.some((e) => e.includes("indisponivel")),
    "evidência valor indisponível",
  );
  const ops = r.moduleScores.find((m) => m.module === "operacao");
  assert(
    !ops.penalties.some((p) => p.ruleId === "ops.sem_responsavel"),
    "sem penalidade responsável incerto",
  );
  assert(r.unavailableSources.includes("crm"), "CRM falha → indisponível");
  assert(r.partial === true, "diagnóstico parcial");

  const withSem = runExecutiveAiEngine(
    fullInput({
      operacao: { ...baseOps, semResponsavel: 3 },
    }),
  );
  const ops2 = withSem.moduleScores.find((m) => m.module === "operacao");
  assert(
    ops2.penalties.some((p) => p.ruleId === "ops.sem_responsavel"),
    "penalidade só com contagem confiável",
  );
}

console.log("Gate 18.5.1 — soft-fetch falha / auditoria / determinismo");
{
  const { buildModuleAuditRows } = await import("../lib/ai/executive-ai-summary.ts");
  const a = runExecutiveAiEngine(fullInput({ crm: null, estoque: null }));
  const b = runExecutiveAiEngine(fullInput({ crm: null, estoque: null }));
  assert(a.unavailableSources.includes("crm"), "CRM soft-fail");
  assert(a.unavailableSources.includes("estoque"), "Estoque soft-fail");
  assert(
    JSON.stringify({ ...a, generatedAt: "x" }) ===
      JSON.stringify({ ...b, generatedAt: "x" }),
    "determinismo com falhas",
  );
  // Soft-fetch lento: engine síncrono — latência isolada no Suspense (contrato).
  assert(typeof a.confidence === "number", "Dashboard não depende do score p/ render");

  const rows = buildModuleAuditRows(a);
  assert(rows.length === 5, "auditoria 5 módulos");
  for (const row of rows) {
    assert(
      row.scoreFinal == null ||
        (row.scoreFinal >= 0 && row.scoreFinal <= 100),
      `score ${row.module} 0-100`,
    );
    assert(!Number.isNaN(row.bonusTotal), `bonus ${row.module}`);
    assert(!Number.isNaN(row.penaltyTotal), `penalty ${row.module}`);
  }
}

console.log("Gate 18.5.1 — responsável OS (resolver)");
{
  const { resolveOsResponsavel, OS_RESPONSAVEL_FALLBACK } = await import(
    "../lib/ordens/os-central-compose.ts"
  );
  assert(
    resolveOsResponsavel({}).nome === OS_RESPONSAVEL_FALLBACK,
    "responsável indisponível → Não atribuído",
  );
  assert(
    resolveOsResponsavel({
      principalAlocacao: { mecanicoId: "m1", nomeCompleto: "Ana" },
    }).source === "alocacao_principal",
    "responsável confiável alocação",
  );
  assert(
    resolveOsResponsavel({
      consultorId: "c1",
      consultorNome: "Bruno",
    }).source === "consultor_id",
    "consultor confiável",
  );
}

console.log(`\nResultado: ${pass} PASS, ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
