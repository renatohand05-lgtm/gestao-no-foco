import type { CommercialPanelData } from "@/types/commercial-panel";
import { buildExecutiveAction } from "@/lib/intelligence/executive-actions";
import { buildExecutiveDiagnosis } from "@/lib/intelligence/executive-diagnosis";
import { buildExecutiveHealth } from "@/lib/intelligence/executive-health";
import { buildExecutiveInsights } from "@/lib/intelligence/executive-insights";
import { buildExecutiveScore } from "@/lib/intelligence/executive-score";
import { buildExecutiveTimeline } from "@/lib/intelligence/executive-timeline";
import type {
  ExecutiveIntelligenceInput,
  ExecutiveIntelligenceResult,
} from "@/lib/intelligence/types";

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
 * Orquestra score, saúde, insights, ação, diagnóstico e timeline.
 */
export function buildExecutiveIntelligence(
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

export { buildExecutiveScore } from "@/lib/intelligence/executive-score";
export { buildExecutiveHealth } from "@/lib/intelligence/executive-health";
export { buildExecutiveInsights } from "@/lib/intelligence/executive-insights";
export { buildExecutiveAction } from "@/lib/intelligence/executive-actions";
export { buildExecutiveDiagnosis } from "@/lib/intelligence/executive-diagnosis";
export { buildExecutiveTimeline } from "@/lib/intelligence/executive-timeline";
export {
  EXECUTIVE_SCORE_WEIGHTS,
  EXECUTIVE_SCORE_BANDS,
  EXECUTIVE_INSIGHTS_MAX,
} from "@/lib/intelligence/thresholds";
export type {
  ExecutiveIntelligenceInput,
  ExecutiveIntelligenceResult,
  ExecutiveScoreResult,
  ExecutiveHealthResult,
  ExecutiveInsight,
  ExecutiveActionResult,
  ExecutiveDiagnosisResult,
  ExecutiveTimelineResult,
} from "@/lib/intelligence/types";
