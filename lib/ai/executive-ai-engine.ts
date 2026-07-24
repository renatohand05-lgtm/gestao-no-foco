/**
 * IA Executiva — engine determinístico (Gate 18.5).
 * Mesmo input → mesmo output. Sem I/O.
 */

import {
  scoreComercial,
  scoreCrm,
  scoreEstoque,
  scoreFinanceiro,
  scoreOperacao,
} from "./executive-ai-rules.ts";
import {
  EXECUTIVE_AI_MAX_DIAGNOSTICS,
  EXECUTIVE_AI_MAX_RECOMMENDATIONS,
  EXECUTIVE_AI_MIN_CONFIDENCE,
  EXECUTIVE_AI_MIN_MODULES,
  EXECUTIVE_AI_MODULE_WEIGHTS,
  EXECUTIVE_AI_MODULES,
  EXECUTIVE_AI_RULE_VERSION,
  type ExecutiveAiDiagnostic,
  type ExecutiveAiHealth,
  type ExecutiveAiInput,
  type ExecutiveAiModule,
  type ExecutiveAiModuleScore,
  type ExecutiveAiPriority,
  type ExecutiveAiRecommendation,
  type ExecutiveAiResult,
  type ExecutiveAiSeverity,
} from "./executive-ai-types.ts";

function href(slug: string, path: string): string {
  return `/${slug}${path}`;
}

function severityRank(s: ExecutiveAiSeverity): number {
  switch (s) {
    case "critica":
      return 100;
    case "alta":
      return 80;
    case "media":
      return 50;
    case "baixa":
      return 20;
    case "oportunidade":
      return 10;
  }
}

function money(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function buildDiagnostics(
  input: ExecutiveAiInput,
  moduleScores: ExecutiveAiModuleScore[],
): ExecutiveAiDiagnostic[] {
  const slug = input.tenantSlug;
  const out: ExecutiveAiDiagnostic[] = [];
  const scoreBy = Object.fromEntries(
    moduleScores.map((m) => [m.module, m]),
  ) as Record<ExecutiveAiModule, ExecutiveAiModuleScore>;

  const fin = input.financeiro;
  if (fin && fin.status !== "unavailable") {
    if (fin.saldoProjetado7d != null && fin.saldoProjetado7d < 0) {
      out.push({
        id: "diag.fin.proj_7d",
        module: "financeiro",
        severity: "critica",
        title: "Fluxo de caixa pode ficar negativo em 7 dias.",
        description: `Saldo projetado em 7 dias: ${money(fin.saldoProjetado7d)}.`,
        evidence: [`saldoProjetado7d=${fin.saldoProjetado7d}`],
        scoreImpact: -25,
        source: "cockpit-financeiro",
        href: href(slug, "/financeiro/fluxo-caixa"),
        audit: {
          ruleId: "fin.proj_7d_negativa",
          ruleVersion: EXECUTIVE_AI_RULE_VERSION,
          reason: "Projeção 7d < 0",
          evidence: [`saldoProjetado7d=${fin.saldoProjetado7d}`],
        },
      });
    }
    if ((fin.pagarVencidoQtd ?? 0) > 0) {
      out.push({
        id: "diag.fin.pagar",
        module: "financeiro",
        severity: "critica",
        title: "Há contas a pagar vencidas.",
        description: `${fin.pagarVencidoQtd} título(s) vencido(s)${
          fin.pagarVencidoValor != null
            ? ` (${money(fin.pagarVencidoValor)})`
            : ""
        }.`,
        evidence: [
          `pagarVencidoQtd=${fin.pagarVencidoQtd}`,
          `pagarVencidoValor=${fin.pagarVencidoValor ?? "n/a"}`,
        ],
        scoreImpact: -20,
        source: "contas-pagar",
        href: href(slug, "/financeiro/contas-pagar?status=vencido"),
        audit: {
          ruleId: "fin.pagar_vencidas",
          ruleVersion: EXECUTIVE_AI_RULE_VERSION,
          reason: "Contas a pagar vencidas > 0",
          evidence: [`qtd=${fin.pagarVencidoQtd}`],
        },
      });
    }
    if ((fin.receberVencidoQtd ?? 0) > 0) {
      out.push({
        id: "diag.fin.receber",
        module: "financeiro",
        severity: "alta",
        title: "Há recebíveis vencidos.",
        description: `${fin.receberVencidoQtd} título(s) em atraso.`,
        evidence: [`receberVencidoQtd=${fin.receberVencidoQtd}`],
        scoreImpact: -15,
        source: "contas-receber",
        href: href(slug, "/financeiro/contas-receber?status=vencido"),
        audit: {
          ruleId: "fin.receber_vencidas",
          ruleVersion: EXECUTIVE_AI_RULE_VERSION,
          reason: "Recebíveis vencidos > 0",
          evidence: [`qtd=${fin.receberVencidoQtd}`],
        },
      });
    }
  }

  const com = input.comercial;
  if (com && com.status !== "unavailable") {
    if (com.metaDisponivel && com.metaAbaixoRitmo) {
      out.push({
        id: "diag.com.meta",
        module: "comercial",
        severity: "alta",
        title: "A meta comercial está abaixo do ritmo esperado.",
        description:
          com.metaPercentual != null
            ? `Atingimento atual: ${com.metaPercentual}%.`
            : "Ritmo abaixo do necessário para a meta.",
        evidence: [
          `metaAbaixoRitmo=true`,
          `metaPercentual=${com.metaPercentual ?? "n/a"}`,
        ],
        scoreImpact: -20,
        source: "inteligencia-comercial",
        href: href(slug, "/vendas/dashboard"),
        audit: {
          ruleId: "com.meta_abaixo",
          ruleVersion: EXECUTIVE_AI_RULE_VERSION,
          reason: "Meta abaixo do ritmo",
          evidence: [`pct=${com.metaPercentual}`],
        },
      });
    }
    if (
      com.conversaoDisponivel &&
      com.taxaConversaoPct != null &&
      com.taxaConversaoPct < 20
    ) {
      out.push({
        id: "diag.com.conversao",
        module: "comercial",
        severity: "media",
        title: "Conversão comercial baixa no período.",
        description: `Taxa de conversão: ${com.taxaConversaoPct}%.`,
        evidence: [`taxaConversaoPct=${com.taxaConversaoPct}`],
        scoreImpact: -15,
        source: "inteligencia-comercial",
        href: href(slug, "/vendas/dashboard"),
        audit: {
          ruleId: "com.conversao_baixa",
          ruleVersion: EXECUTIVE_AI_RULE_VERSION,
          reason: "Conversão < 20%",
          evidence: [`taxa=${com.taxaConversaoPct}`],
        },
      });
    }
    if ((com.orcamentosAguardando ?? 0) > 0 && (com.valorEmNegociacao ?? 0) > 0) {
      out.push({
        id: "diag.com.negociacao",
        module: "comercial",
        severity: "media",
        title: "Há valor relevante parado em negociação.",
        description: `${com.orcamentosAguardando} orçamento(s); ${money(
          com.valorEmNegociacao ?? 0,
        )} em negociação.`,
        evidence: [
          `orcamentos=${com.orcamentosAguardando}`,
          `negociacao=${com.valorEmNegociacao}`,
        ],
        scoreImpact: -10,
        source: "inteligencia-comercial",
        href: href(slug, "/vendas?status=orcamento"),
        audit: {
          ruleId: "com.negociacao_alta",
          ruleVersion: EXECUTIVE_AI_RULE_VERSION,
          reason: "Volume em negociação",
          evidence: [`valor=${com.valorEmNegociacao}`],
        },
      });
    }
  }

  const crm = input.crm;
  if (crm && crm.status !== "unavailable") {
    if ((crm.vipSemRetorno ?? 0) > 0) {
      out.push({
        id: "diag.crm.vip",
        module: "crm",
        severity: "alta",
        title: "Clientes VIP estão sem retorno recente.",
        description: `${crm.vipSemRetorno} VIP sem retorno.`,
        evidence: [`vipSemRetorno=${crm.vipSemRetorno}`],
        scoreImpact: scoreBy.crm?.penalties.find((p) => p.ruleId === "crm.vip_sem_retorno")
          ?.delta ?? -10,
        source: "crm-executivo",
        href: href(slug, "/clientes/central"),
        audit: {
          ruleId: "crm.vip_sem_retorno",
          ruleVersion: EXECUTIVE_AI_RULE_VERSION,
          reason: "VIP sem retorno",
          evidence: [`n=${crm.vipSemRetorno}`],
        },
      });
    } else if ((crm.clientesEmRisco ?? 0) > 0) {
      out.push({
        id: "diag.crm.risco",
        module: "crm",
        severity: "alta",
        title: "Há clientes em risco na carteira.",
        description: `${crm.clientesEmRisco} cliente(s) em risco.`,
        evidence: [`clientesEmRisco=${crm.clientesEmRisco}`],
        scoreImpact: -Math.min(25, (crm.clientesEmRisco ?? 0) * 3),
        source: "crm-executivo",
        href: href(slug, "/clientes/central"),
        audit: {
          ruleId: "crm.clientes_risco",
          ruleVersion: EXECUTIVE_AI_RULE_VERSION,
          reason: "Clientes em risco",
          evidence: [`n=${crm.clientesEmRisco}`],
        },
      });
    }
  }

  const ops = input.operacao;
  if (ops && ops.status !== "unavailable") {
    if ((ops.atrasadas ?? 0) > 0) {
      out.push({
        id: "diag.ops.atrasadas",
        module: "operacao",
        severity: "critica",
        title: `Existem ${ops.atrasadas} OS crítica(s) atrasada(s).`,
        description: "OS com prazo vencido sem avanço adequado.",
        evidence: [`atrasadas=${ops.atrasadas}`],
        scoreImpact: -Math.min(25, (ops.atrasadas ?? 0) * 5),
        source: "centro-operacoes",
        href: href(slug, "/ordens?sort=mais_atrasadas"),
        audit: {
          ruleId: "ops.atrasadas",
          ruleVersion: EXECUTIVE_AI_RULE_VERSION,
          reason: "OS atrasadas",
          evidence: [`n=${ops.atrasadas}`],
        },
      });
    } else if ((ops.aguardandoAprovacao ?? 0) > 0) {
      out.push({
        id: "diag.ops.aprovacao",
        module: "operacao",
        severity: "alta",
        title: "Há OS aguardando aprovação do cliente.",
        description: `${ops.aguardandoAprovacao} OS na fila de aprovação.`,
        evidence: [
          `aguardandoAprovacao=${ops.aguardandoAprovacao}`,
          "valorAguardandoAprovacao=indisponivel",
        ],
        scoreImpact: -Math.min(20, (ops.aguardandoAprovacao ?? 0) * 4),
        source: "centro-operacoes",
        href: href(slug, "/ordens?status=aguardando_aprovacao"),
        audit: {
          ruleId: "ops.aguardando_aprovacao",
          ruleVersion: EXECUTIVE_AI_RULE_VERSION,
          reason: "Aguardando aprovação",
          evidence: [`n=${ops.aguardandoAprovacao}`],
        },
      });
    } else if ((ops.paradas ?? 0) > 0) {
      out.push({
        id: "diag.ops.paradas",
        module: "operacao",
        severity: "alta",
        title: "Existem OS paradas sem avanço.",
        description: `${ops.paradas} OS parada(s).`,
        evidence: [`paradas=${ops.paradas}`],
        scoreImpact: -Math.min(20, (ops.paradas ?? 0) * 4),
        source: "centro-operacoes",
        href: href(slug, "/centro-operacoes"),
        audit: {
          ruleId: "ops.paradas",
          ruleVersion: EXECUTIVE_AI_RULE_VERSION,
          reason: "OS paradas",
          evidence: [`n=${ops.paradas}`],
        },
      });
    }
  }

  const est = input.estoque;
  if (est && est.status !== "unavailable") {
    if ((est.zerados ?? 0) > 0) {
      out.push({
        id: "diag.est.zerados",
        module: "estoque",
        severity: "alta",
        title: `Há ${est.zerados} itens zerados com impacto operacional.`,
        description: "Ruptura de estoque em SKUs ativos.",
        evidence: [`zerados=${est.zerados}`],
        scoreImpact: -Math.min(25, (est.zerados ?? 0) * 5),
        source: "estoque-executivo",
        href: href(slug, "/estoque/dashboard?criticidade=zerado"),
        audit: {
          ruleId: "est.zerados",
          ruleVersion: EXECUTIVE_AI_RULE_VERSION,
          reason: "Itens zerados",
          evidence: [`n=${est.zerados}`],
        },
      });
    } else if ((est.abaixoMinimo ?? 0) > 0) {
      out.push({
        id: "diag.est.abaixo",
        module: "estoque",
        severity: "media",
        title: "Há produtos abaixo do estoque mínimo.",
        description: `${est.abaixoMinimo} SKU(s) abaixo do mínimo.`,
        evidence: [`abaixoMinimo=${est.abaixoMinimo}`],
        scoreImpact: -Math.min(20, (est.abaixoMinimo ?? 0) * 4),
        source: "estoque-executivo",
        href: href(slug, "/estoque/dashboard?criticidade=abaixo_minimo"),
        audit: {
          ruleId: "est.abaixo_minimo",
          ruleVersion: EXECUTIVE_AI_RULE_VERSION,
          reason: "Abaixo do mínimo",
          evidence: [`n=${est.abaixoMinimo}`],
        },
      });
    }
  }

  // Oportunidade: meta atingida (somente se não houver crítica financeira/ops)
  if (
    com?.metaDisponivel &&
    com.metaAtingida &&
    !out.some((d) => d.severity === "critica")
  ) {
    out.push({
      id: "diag.com.oportunidade_meta",
      module: "comercial",
      severity: "oportunidade",
      title: "Meta comercial atingida no período.",
      description: "Oportunidade de reforçar o ritmo e converter negociações.",
      evidence: [`metaAtingida=true`],
      scoreImpact: 10,
      source: "inteligencia-comercial",
      href: href(slug, "/vendas/dashboard"),
      audit: {
        ruleId: "com.meta_atingida",
        ruleVersion: EXECUTIVE_AI_RULE_VERSION,
        reason: "Meta atingida",
        evidence: [],
      },
    });
  }

  // Dedup by id
  const unique = new Map<string, ExecutiveAiDiagnostic>();
  for (const d of out) {
    if (!unique.has(d.id)) unique.set(d.id, d);
  }

  return [...unique.values()]
    .sort((a, b) => {
      const sr = severityRank(b.severity) - severityRank(a.severity);
      if (sr !== 0) return sr;
      const impactA = Math.abs(a.scoreImpact);
      const impactB = Math.abs(b.scoreImpact);
      if (impactB !== impactA) return impactB - impactA;
      return a.id.localeCompare(b.id);
    })
    .slice(0, EXECUTIVE_AI_MAX_DIAGNOSTICS);
}

const REC_BY_DIAG: Record<
  string,
  { title: string; action: string; impact?: string }
> = {
  "diag.fin.proj_7d": {
    title: "Proteger o caixa dos próximos 7 dias",
    action: "Revisar saídas e antecipar entradas críticas.",
  },
  "diag.fin.pagar": {
    title: "Regularizar contas vencidas",
    action: "Regularizar contas vencidas antes dos próximos compromissos.",
  },
  "diag.fin.receber": {
    title: "Cobrar recebíveis em atraso",
    action: "Priorizar cobrança dos títulos vencidos.",
  },
  "diag.com.meta": {
    title: "Recuperar ritmo da meta",
    action: "Acelerar faturamento e follow-up comercial do dia.",
  },
  "diag.com.conversao": {
    title: "Melhorar conversão comercial",
    action: "Recuperar orçamentos de alto valor ainda em negociação.",
  },
  "diag.com.negociacao": {
    title: "Destravar negociações abertas",
    action: "Recuperar orçamentos de alto valor ainda em negociação.",
  },
  "diag.crm.vip": {
    title: "Retomar contato com VIP",
    action: "Contactar clientes VIP sem retorno.",
  },
  "diag.crm.risco": {
    title: "Reativar clientes em risco",
    action: "Contactar clientes em risco com maior valor potencial.",
  },
  "diag.ops.atrasadas": {
    title: "Destravar OS atrasadas",
    action: "Priorizar a liberação das OS críticas atrasadas.",
  },
  "diag.ops.aprovacao": {
    title: "Acelerar aprovações de OS",
    action: "Priorizar a aprovação das OS de maior valor.",
  },
  "diag.ops.paradas": {
    title: "Retomar OS paradas",
    action: "Destravar OS paradas na oficina.",
  },
  "diag.est.zerados": {
    title: "Repor itens zerados",
    action: "Repor os itens zerados que impactam OS abertas.",
  },
  "diag.est.abaixo": {
    title: "Comprar até o mínimo",
    action: "Repor produtos abaixo do estoque mínimo.",
  },
  "diag.com.oportunidade_meta": {
    title: "Consolidar o momento comercial",
    action: "Converter o pipeline restante enquanto a meta está atingida.",
  },
};

function buildRecommendations(
  diagnostics: ExecutiveAiDiagnostic[],
): ExecutiveAiRecommendation[] {
  const recs: ExecutiveAiRecommendation[] = [];
  let priority = 1;
  for (const d of diagnostics) {
    const tpl = REC_BY_DIAG[d.id];
    if (!tpl) continue;
    recs.push({
      id: `rec.${d.id}`,
      priority: priority++,
      title: tpl.title,
      action: tpl.action,
      reason: d.title,
      expectedImpact: tpl.impact,
      href: d.href,
      source: d.source,
      module: d.module,
      diagnosticId: d.id,
      audit: {
        ruleId: `rec.${d.audit.ruleId}`,
        ruleVersion: EXECUTIVE_AI_RULE_VERSION,
        reason: `Derivada de ${d.id}`,
        evidence: d.evidence,
      },
    });
    if (recs.length >= EXECUTIVE_AI_MAX_RECOMMENDATIONS) break;
  }
  return recs;
}

function pickPriority(
  diagnostics: ExecutiveAiDiagnostic[],
  recommendations: ExecutiveAiRecommendation[],
): ExecutiveAiPriority {
  const first = diagnostics[0];
  if (!first) {
    return {
      title: "Nenhuma prioridade crítica no momento.",
      reason: "Sem diagnósticos acionáveis com os dados disponíveis.",
      module: null,
      diagnosticId: null,
    };
  }
  const rec = recommendations.find((r) => r.diagnosticId === first.id);
  return {
    title: rec
      ? `Prioridade máxima: ${rec.action}`
      : `Prioridade máxima: ${first.title}`,
    reason: first.description,
    module: first.module,
    diagnosticId: first.id,
    href: first.href,
  };
}

/**
 * Confidence 0–100:
 * available = 100% do peso do módulo; partial = 50%; unavailable = 0%.
 */
export function calcExecutiveAiConfidence(
  moduleScores: ExecutiveAiModuleScore[],
): number {
  let num = 0;
  let den = 0;
  for (const m of moduleScores) {
    const w = EXECUTIVE_AI_MODULE_WEIGHTS[m.module];
    den += w;
    if (m.status === "available") num += w;
    else if (m.status === "partial") num += w * 0.5;
  }
  if (den <= 0) return 0;
  const pct = (num / den) * 100;
  if (!Number.isFinite(pct)) return 0;
  return Math.round(pct);
}

/**
 * Média ponderada com redistribuição quando módulo indisponível.
 */
export function calcExecutiveScore(
  moduleScores: ExecutiveAiModuleScore[],
): { score: number | null; redistributed: boolean } {
  const available = moduleScores.filter(
    (m) => m.score != null && m.status !== "unavailable",
  );
  if (available.length === 0) return { score: null, redistributed: false };

  const totalWeight = available.reduce((a, m) => a + m.weight, 0);
  if (totalWeight <= 0) return { score: null, redistributed: false };

  const redistributed =
    available.length < EXECUTIVE_AI_MODULES.length ||
    moduleScores.some((m) => m.status === "unavailable");

  let acc = 0;
  for (const m of available) {
    const eff = m.weight / totalWeight;
    m.effectiveWeight = Math.round(eff * 1000) / 10; // % com 1 decimal
    acc += (m.score as number) * eff;
  }

  const score = Math.round(acc);
  if (!Number.isFinite(score)) return { score: null, redistributed };
  return { score: Math.max(0, Math.min(100, score)), redistributed };
}

export function classifyExecutiveHealth(
  score: number | null,
  availableModules: number,
  confidence: number,
): ExecutiveAiHealth {
  if (
    score == null ||
    availableModules < EXECUTIVE_AI_MIN_MODULES ||
    confidence < EXECUTIVE_AI_MIN_CONFIDENCE
  ) {
    return "indisponivel";
  }
  if (score >= 95) return "excelente";
  if (score >= 80) return "saudavel";
  if (score >= 60) return "atencao";
  return "critico";
}

export function runExecutiveAiEngine(input: ExecutiveAiInput): ExecutiveAiResult {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const weights = EXECUTIVE_AI_MODULE_WEIGHTS;

  const moduleScores: ExecutiveAiModuleScore[] = [
    scoreFinanceiro(input.financeiro, weights.financeiro),
    scoreComercial(input.comercial, weights.comercial),
    scoreCrm(input.crm, weights.crm),
    scoreOperacao(input.operacao, weights.operacao),
    scoreEstoque(input.estoque, weights.estoque),
  ];

  // Stable module order for determinism
  moduleScores.sort(
    (a, b) =>
      EXECUTIVE_AI_MODULES.indexOf(a.module) -
      EXECUTIVE_AI_MODULES.indexOf(b.module),
  );

  const { score: executiveScore } = calcExecutiveScore(moduleScores);
  const confidence = calcExecutiveAiConfidence(moduleScores);
  const sourcesUsed = moduleScores
    .filter((m) => m.status !== "unavailable")
    .map((m) => m.module);
  const unavailableSources = moduleScores
    .filter((m) => m.status === "unavailable")
    .map((m) => m.module);
  const partial =
    moduleScores.some((m) => m.status === "partial") ||
    unavailableSources.length > 0;

  const health = classifyExecutiveHealth(
    executiveScore,
    sourcesUsed.length,
    confidence,
  );

  if (health === "indisponivel" && executiveScore == null) {
    return {
      executiveScore: null,
      health: "indisponivel",
      confidence,
      partial: true,
      priority: {
        title: "Diagnóstico indisponível",
        reason:
          "Cobertura insuficiente de módulos ou confiança abaixo do mínimo.",
        module: null,
        diagnosticId: null,
      },
      diagnostics: [],
      recommendations: [],
      moduleScores,
      generatedAt,
      sourcesUsed,
      unavailableSources,
    };
  }

  // When health is indisponivel due to confidence/modules but we have scores,
  // still compute diagnostics but flag clearly.
  const diagnostics =
    health === "indisponivel" && sourcesUsed.length === 0
      ? []
      : buildDiagnostics(input, moduleScores);
  const recommendations = buildRecommendations(diagnostics);
  const priority = pickPriority(diagnostics, recommendations);

  return {
    executiveScore: health === "indisponivel" ? null : executiveScore,
    health,
    confidence,
    partial,
    priority,
    diagnostics,
    recommendations,
    moduleScores,
    generatedAt,
    sourcesUsed,
    unavailableSources,
  };
}
