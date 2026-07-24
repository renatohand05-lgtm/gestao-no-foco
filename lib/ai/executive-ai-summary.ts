/**
 * IA Executiva — labels e helpers de apresentação (Gate 18.5).
 */

import type {
  ExecutiveAiHealth,
  ExecutiveAiModule,
  ExecutiveAiResult,
  ExecutiveAiSeverity,
} from "./executive-ai-types.ts";

export const EXECUTIVE_AI_TITLE = "IA Executiva";
export const EXECUTIVE_AI_BADGE = "Regras determinísticas";
export const EXECUTIVE_AI_NOTE =
  "Análise baseada em regras e dados do sistema.";

export const EXECUTIVE_AI_HEALTH_LABEL: Record<ExecutiveAiHealth, string> = {
  excelente: "Excelente",
  saudavel: "Saudável",
  atencao: "Atenção",
  critico: "Crítico",
  indisponivel: "Indisponível",
};

export const EXECUTIVE_AI_MODULE_LABEL: Record<ExecutiveAiModule, string> = {
  financeiro: "Financeiro",
  comercial: "Comercial",
  crm: "CRM",
  operacao: "Operação",
  estoque: "Estoque",
};

export const EXECUTIVE_AI_SEVERITY_LABEL: Record<ExecutiveAiSeverity, string> = {
  critica: "Crítica",
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
  oportunidade: "Oportunidade",
};

export function formatExecutiveScore(score: number | null): string {
  if (score == null || !Number.isFinite(score)) return "Indisponível";
  return String(Math.round(score));
}

export function formatExecutiveConfidence(confidence: number): string {
  const n = Number.isFinite(confidence) ? Math.round(confidence) : 0;
  return `Cobertura dos dados: ${n}%`;
}

export function executiveAiPartialLabel(result: ExecutiveAiResult): string | null {
  if (result.health === "indisponivel") return "Diagnóstico indisponível";
  if (result.partial) return "Diagnóstico parcial";
  return null;
}

/**
 * Hrefs canônicos da IA / Decisão (Gate 18.5.1).
 * Somente parâmetros reconhecidos pelas telas.
 */
export function executiveAiCanonicalHref(
  tenantSlug: string,
  kind:
    | "ordens_atrasadas"
    | "ordens_aprovacao"
    | "ordens_paradas"
    | "estoque_zerado"
    | "estoque_abaixo"
    | "estoque_dashboard"
    | "fluxo_caixa"
    | "pagar_vencido"
    | "receber_vencido"
    | "vendas_ci"
    | "vendas_orcamento"
    | "clientes_central",
): string {
  const base = `/${tenantSlug}`;
  switch (kind) {
    case "ordens_atrasadas":
      return `${base}/ordens?sort=mais_atrasadas`;
    case "ordens_aprovacao":
      return `${base}/ordens?status=aguardando_aprovacao`;
    case "ordens_paradas":
      return `${base}/centro-operacoes`;
    case "estoque_zerado":
      return `${base}/estoque/dashboard?criticidade=zerado`;
    case "estoque_abaixo":
      return `${base}/estoque/dashboard?criticidade=abaixo_minimo`;
    case "estoque_dashboard":
      return `${base}/estoque/dashboard`;
    case "fluxo_caixa":
      return `${base}/financeiro/fluxo-caixa`;
    case "pagar_vencido":
      return `${base}/financeiro/contas-pagar?status=vencido`;
    case "receber_vencido":
      return `${base}/financeiro/contas-receber?status=vencido`;
    case "vendas_ci":
      return `${base}/vendas/dashboard`;
    case "vendas_orcamento":
      return `${base}/vendas?status=orcamento`;
    case "clientes_central":
      return `${base}/clientes/central`;
  }
}

/** Rejeita filtros fictícios conhecidos (Gate 18.5.1). */
export function isFictitiousExecutiveAiFilter(hrefPath: string): boolean {
  if (/[?&]atrasadas=/.test(hrefPath)) return true;
  // /{tenant}/estoque sem /dashboard
  if (
    /\/[^/]+\/estoque\/?(\?|$)/.test(hrefPath) &&
    !hrefPath.includes("/estoque/dashboard")
  ) {
    return true;
  }
  return false;
}

export function buildModuleAuditRows(result: ExecutiveAiResult): Array<{
  module: string;
  scoreInicial: number | null;
  bonusTotal: number;
  penaltyTotal: number;
  scoreFinal: number | null;
  qualidade: string;
  pesoOriginal: number;
  pesoEfetivo: number;
  contribuicao: number | null;
}> {
  const available = result.moduleScores.filter(
    (m) => m.score != null && m.status !== "unavailable",
  );
  const totalW = available.reduce((a, m) => a + m.weight, 0);
  return result.moduleScores.map((m) => {
    const bonusTotal = m.bonuses.reduce((a, b) => a + b.delta, 0);
    const penaltyTotal = m.penalties.reduce((a, b) => a + b.delta, 0);
    const contrib =
      m.score != null && totalW > 0 && m.status !== "unavailable"
        ? Math.round(((m.score * m.weight) / totalW) * 10) / 10
        : null;
    return {
      module: m.module,
      scoreInicial: m.score == null ? null : 100,
      bonusTotal,
      penaltyTotal,
      scoreFinal: m.score,
      qualidade: m.status,
      pesoOriginal: m.weight,
      pesoEfetivo: m.effectiveWeight,
      contribuicao: contrib,
    };
  });
}
