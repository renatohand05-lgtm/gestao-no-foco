/**
 * Alertas inteligentes — destacam indicadores críticos a partir de scores/sinais (29.4).
 */

import type {
  ExecutiveInsightSignal,
  ExecutiveNamedScores,
  SignalSeverity,
} from "./types.ts";

export type CriticalIndicator = {
  id: string;
  label: string;
  severity: SignalSeverity;
  detail: string;
  href?: string;
};

function scoreSeverity(score: number | null): SignalSeverity | null {
  if (score == null) return null;
  if (score < 40) return "danger";
  if (score < 60) return "warning";
  return null;
}

export function buildCriticalIndicators(input: {
  scores: ExecutiveNamedScores;
  signals: ExecutiveInsightSignal[];
}): CriticalIndicator[] {
  const out: CriticalIndicator[] = [];

  const modules: Array<{
    key: keyof Pick<
      ExecutiveNamedScores,
      "financeiro" | "comercial" | "operacional" | "crm" | "estoque"
    >;
    label: string;
    href: string;
  }> = [
    { key: "financeiro", label: "Score financeiro", href: "/financeiro" },
    { key: "comercial", label: "Score comercial", href: "/crm" },
    { key: "operacional", label: "Score operacional", href: "/ordens" },
    { key: "crm", label: "Score CRM", href: "/crm" },
    { key: "estoque", label: "Score estoque", href: "/estoque" },
  ];

  for (const m of modules) {
    const score = input.scores[m.key];
    const sev = scoreSeverity(score);
    if (sev && score != null) {
      out.push({
        id: `critical.score.${m.key}`,
        label: m.label,
        severity: sev,
        detail: `Score ${Math.round(score)} — abaixo do limiar de atenção.`,
        href: m.href,
      });
    }
  }

  const overallSev = scoreSeverity(input.scores.overall);
  if (overallSev && input.scores.overall != null) {
    out.unshift({
      id: "critical.score.overall",
      label: "Saúde operacional (geral)",
      severity: overallSev,
      detail: `Score geral ${Math.round(input.scores.overall)}.`,
      href: "/dashboard",
    });
  }

  for (const s of input.signals) {
    if (s.severity === "danger" || s.severity === "warning") {
      if (s.kind === "tendencia" && s.direction === "queda") {
        out.push({
          id: `critical.signal.${s.id}`,
          label: s.title,
          severity: s.severity,
          detail: s.summary,
        });
      }
      if (s.kind === "anomalia" && s.anomaly !== "nenhuma") {
        out.push({
          id: `critical.signal.${s.id}`,
          label: s.title,
          severity: s.severity,
          detail: s.summary,
        });
      }
    }
  }

  return out.slice(0, 12);
}
