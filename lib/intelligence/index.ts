import type { CommercialPanelData } from "../../types/commercial-panel.ts";
import { buildExecutiveAction } from "./executive-actions.ts";
import { buildExecutiveDiagnosis } from "./executive-diagnosis.ts";
import { buildExecutiveHealth } from "./executive-health.ts";
import { buildExecutiveInsights } from "./executive-insights.ts";
import { buildExecutiveScore } from "./executive-score.ts";
import { buildExecutiveTimeline } from "./executive-timeline.ts";
import type {
  ExecutiveIntelligenceInput,
  ExecutiveIntelligenceResult,
} from "./types.ts";

/**
 * Mapeia CommercialPanelData → entrada da inteligência (sem novos fetches).
 */
export function toExecutiveIntelligenceInput(
  panel: CommercialPanelData,
  tenantSlug: string,
): ExecutiveIntelligenceInput {
  const p = panel.projecao;
  return {
    metaMensal: p.valor_meta,
    realizado: p.faturamento_realizado,
    projecaoDiasCorridos: p.projecao_dias_corridos,
    projecaoDiasUteis: p.projecao_dias_uteis,
    atingimentoPercentual: p.percentual_atingido,
    gapMeta: p.restante_meta,
    necessarioDiaUtil: p.necessario_por_dia_util,
    ritmoEsperado: p.ritmo_esperado,
    ritmoAtual: p.ritmo_atual,
    diferencaRitmoPp: p.ritmo_diferenca_pp,
    tendencia: panel.tendencia,
    tendenciaPct: panel.tendencia_pct,
    tendenciaInsuficiente: panel.tendencia_insuficiente,
    confianca: panel.confianca,
    confiancaMotivo: panel.confianca_motivo,
    probabilidadeMeta: panel.probabilidade,
    probabilidadeScore: panel.probabilidade_score,
    crescimentoPeriodo: p.comparacao?.crescimento_realizado_pct ?? null,
    ticketAtual: panel.ticket.ticket_medio_atual,
    ticketAnterior: panel.ticket.ticket_medio_anterior,
    ticketVariacaoPct: panel.ticket.variacao_pct,
    vendasQuantidade: panel.ticket.quantidade_vendas,
    diasUteisDecorridos: p.dias_uteis_decorridos,
    diasUteisRestantes: p.dias_uteis_restantes,
    diasUteisTotais: p.dias_uteis_totais,
    diasCorridosDecorridos: p.dias_decorridos,
    diasCorridosTotais: p.dias_totais,
    periodoEncerrado: p.mes_encerrado,
    periodoFuturo: p.mes_futuro,
    possuiMeta: p.status !== "sem_meta" && p.valor_meta !== null,
    mediaDiariaUtil: p.media_diaria_util,
    tenantSlug,
    competenciaYm: panel.competencia.slice(0, 7),
    dataDe: panel.dataDe,
    dataAte: panel.dataAte,
    metaId: p.meta?.id ?? null,
  };
}

/**
 * Orquestra score, saúde, insights, ação, diagnóstico e timeline (EI comercial).
 * Sprint 29.5 — nomenclatura oficial: `composeCommercialExecutiveIntelligence`.
 * Entrada pública: `@/lib/enterprise`.
 */
export function composeCommercialExecutiveIntelligence(
  panel: CommercialPanelData,
  tenantSlug: string,
): ExecutiveIntelligenceResult {
  const input = toExecutiveIntelligenceInput(panel, tenantSlug);
  return {
    score: buildExecutiveScore(input),
    health: buildExecutiveHealth(input),
    insights: buildExecutiveInsights(input),
    action: buildExecutiveAction(input),
    diagnosis: buildExecutiveDiagnosis(input),
    timeline: buildExecutiveTimeline(input),
  };
}

export { buildExecutiveScore } from "./executive-score.ts";
export { buildExecutiveHealth } from "./executive-health.ts";
export { buildExecutiveInsights } from "./executive-insights.ts";
export { buildExecutiveAction } from "./executive-actions.ts";
export { buildExecutiveDiagnosis } from "./executive-diagnosis.ts";
export { buildExecutiveTimeline } from "./executive-timeline.ts";
export {
  EXECUTIVE_SCORE_WEIGHTS,
  EXECUTIVE_SCORE_BANDS,
  EXECUTIVE_INSIGHTS_MAX,
} from "./thresholds.ts";
export type {
  ExecutiveIntelligenceInput,
  ExecutiveIntelligenceResult,
  ExecutiveScoreResult,
  ExecutiveHealthResult,
  ExecutiveInsight,
  ExecutiveActionResult,
  ExecutiveDiagnosisResult,
  ExecutiveTimelineResult,
} from "./types.ts";
