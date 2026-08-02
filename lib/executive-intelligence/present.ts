/**
 * Apresentação: pack → cards de insight (Sprint 29.4).
 * Não altera KPIs; apenas deriva texto a partir de sinais.
 */

import type { ExecutiveInsightSignal, ExecutiveIntelligencePack } from "./types.ts";

export type ExecutiveInsightPresentationCard = {
  id: string;
  title: string;
  body: string;
  origem: string;
  periodo: string;
  confianca: string;
  href?: string;
  severity: "info" | "warning" | "danger" | "success";
};

function signalToCard(
  s: ExecutiveInsightSignal,
): ExecutiveInsightPresentationCard | null {
  if (s.kind === "tendencia") {
    if (s.direction === "insuficiente" || s.direction === "estavel") return null;
    return {
      id: `ei-${s.id}`,
      title: s.title,
      body: s.summary,
      origem: "Inteligência Executiva · tendência",
      periodo: "Série do período",
      confianca: "Heurística",
      severity: s.severity,
    };
  }
  if (s.kind === "anomalia") {
    if (s.anomaly === "nenhuma") return null;
    return {
      id: `ei-${s.id}`,
      title: s.title,
      body: s.summary,
      origem: "Inteligência Executiva · anomalia",
      periodo: s.pointLabel ?? "Série do período",
      confianca: "Heurística",
      severity: s.severity,
    };
  }
  if (s.kind === "sazonalidade") {
    if (s.hint === "insuficiente" || s.hint === "sem_padrao") return null;
    return {
      id: `ei-${s.id}`,
      title: s.title,
      body: s.summary,
      origem: "Inteligência Executiva · sazonalidade",
      periodo: "Série do período",
      confianca: "Heurística",
      severity: "info",
    };
  }
  return null;
}

/** Cards acionáveis derivados do pack (máx. 6). */
export function presentEnterpriseInsightCards(
  pack: ExecutiveIntelligencePack,
): ExecutiveInsightPresentationCard[] {
  const fromSignals = pack.signals
    .map(signalToCard)
    .filter((c): c is ExecutiveInsightPresentationCard => c != null);

  const fromCritical = pack.criticalIndicators.slice(0, 3).map((c) => ({
    id: `ei-${c.id}`,
    title: c.label,
    body: c.detail,
    origem: "Inteligência Executiva · alerta",
    periodo: "Ciclo atual",
    confianca: pack.scores.source === "unavailable" ? "Baixa" : "Alta",
    href: c.href,
    severity: c.severity,
  }));

  const merged = [...fromCritical, ...fromSignals];
  const seen = new Set<string>();
  const out: ExecutiveInsightPresentationCard[] = [];
  for (const card of merged) {
    if (seen.has(card.id)) continue;
    seen.add(card.id);
    out.push(card);
    if (out.length >= 6) break;
  }
  return out;
}
