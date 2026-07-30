/**
 * Sprint 22.6.1 — Helpers de apresentação da Central de Inteligência.
 * Apenas agregações visuais a partir de dados já existentes nos runs.
 * Não altera engines, cálculos financeiros nem regras de negócio.
 */
import type {
  ImportHistoryEntry,
  ImportLearningRule,
  ImportMappingConfidence,
} from "@/lib/import-engine";

export type IntelligenceKpiKey =
  | "total"
  | "completed"
  | "errors"
  | "pending"
  | "avgDuration"
  | "processedRows"
  | "autoClassify"
  | "qualityScore";

export type IntelligenceKpi = {
  key: IntelligenceKpiKey;
  label: string;
  value: string;
  hint?: string;
  /** true = dado ainda não disponível na engine; UI deve marcar como placeholder */
  placeholder?: boolean;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
};

export type IntelligenceTimelineEvent = {
  id: string;
  timeLabel: string;
  title: string;
  status: "done" | "warning" | "pending" | "error";
  durationLabel: string | null;
};

export type IntelligenceHealthScore = {
  percent: number | null;
  badge: "Excelente" | "Bom" | "Atenção" | "Crítico" | "Indisponível";
  description: string;
  placeholder: boolean;
  factors: Array<{ label: string; value: string; placeholder?: boolean }>;
};

export function formatDurationMs(ms: number | null | undefined): string {
  if (ms == null || Number.isNaN(ms)) return "—";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)} s`;
  const m = Math.floor(s / 60);
  const rem = Math.round(s % 60);
  return `${m}m ${rem}s`;
}

export function formatDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function formatClock(iso: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "--:--";
  }
}

export function confidenceBand(
  confidence: number,
): "Alta" | "Média" | "Baixa" {
  if (confidence >= 0.85) return "Alta";
  if (confidence >= 0.55) return "Média";
  return "Baixa";
}

export function averageMappingConfidence(
  confidence: ImportMappingConfidence[],
): number | null {
  if (confidence.length === 0) return null;
  const sum = confidence.reduce((acc, c) => acc + c.confidence, 0);
  return sum / confidence.length;
}

export function buildIntelligenceKpis(
  runs: ImportHistoryEntry[],
  totalKnown?: number,
): IntelligenceKpi[] {
  const total = totalKnown ?? runs.length;
  const completed = runs.filter((r) => r.status === "completed").length;
  const errors = runs.filter(
    (r) => r.status === "failed" || r.status === "partial",
  ).length;
  const pending = runs.filter((r) => r.status === "preview").length;
  const durations = runs
    .map((r) => r.durationMs)
    .filter((d): d is number => typeof d === "number" && d >= 0);
  const avgDuration =
    durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : null;
  const processedRows = runs.reduce((acc, r) => acc + (r.totalRows || 0), 0);

  const health = buildHealthScore(runs);

  return [
    {
      key: "total",
      label: "Total de importações",
      value: String(total),
      hint: "Runs no tenant",
      tone: "info",
    },
    {
      key: "completed",
      label: "Concluídas",
      value: String(completed),
      hint: "Status completed (amostra carregada)",
      tone: "success",
    },
    {
      key: "errors",
      label: "Com erro",
      value: String(errors),
      hint: "Failed ou partial",
      tone: errors > 0 ? "danger" : "neutral",
    },
    {
      key: "pending",
      label: "Pendentes",
      value: String(pending),
      hint: "Status preview",
      tone: pending > 0 ? "warning" : "neutral",
    },
    {
      key: "avgDuration",
      label: "Tempo médio",
      value: avgDuration != null ? formatDurationMs(avgDuration) : "—",
      hint:
        avgDuration != null
          ? `${durations.length} run(s) com duração`
          : "Sem durationMs nos runs",
      placeholder: avgDuration == null,
      tone: "neutral",
    },
    {
      key: "processedRows",
      label: "Registros processados",
      value: processedRows.toLocaleString("pt-BR"),
      hint: "Soma de totalRows na amostra",
      tone: "info",
    },
    {
      key: "autoClassify",
      label: "Classificação automática",
      value: "—",
      hint: "Métrica por linha ainda não persistida na engine",
      placeholder: true,
      tone: "neutral",
    },
    {
      key: "qualityScore",
      label: "Score de qualidade",
      value:
        health.percent != null ? `${Math.round(health.percent)}%` : "—",
      hint: health.placeholder
        ? "Estimativa visual a partir dos runs"
        : health.description,
      placeholder: health.placeholder && health.percent == null,
      tone:
        health.badge === "Crítico"
          ? "danger"
          : health.badge === "Atenção"
            ? "warning"
            : health.badge === "Excelente" || health.badge === "Bom"
              ? "success"
              : "neutral",
    },
  ];
}

export function buildHealthScore(
  runs: ImportHistoryEntry[],
): IntelligenceHealthScore {
  if (runs.length === 0) {
    return {
      percent: null,
      badge: "Indisponível",
      description:
        "Sem importações na amostra — health score aguarda dados reais.",
      placeholder: true,
      factors: [
        { label: "Registros completos", value: "—", placeholder: true },
        { label: "Registros incompletos", value: "—", placeholder: true },
        { label: "Duplicidades", value: "—", placeholder: true },
        { label: "Necessidade de confirmação", value: "—", placeholder: true },
        { label: "Inconsistências", value: "—", placeholder: true },
      ],
    };
  }

  const totalRows = runs.reduce((a, r) => a + (r.totalRows || 0), 0);
  const imported = runs.reduce((a, r) => a + (r.importedRows || 0), 0);
  const rejected = runs.reduce((a, r) => a + (r.rejectedRows || 0), 0);
  const failedRuns = runs.filter((r) => r.status === "failed").length;
  const partialRuns = runs.filter((r) => r.status === "partial").length;
  const previewRuns = runs.filter((r) => r.status === "preview").length;

  // Estimativa visual (UI only): aceitação de linhas − penalidades de status.
  let percent: number | null = null;
  if (totalRows > 0) {
    const acceptRate = (imported / totalRows) * 100;
    const statusPenalty =
      (failedRuns / runs.length) * 25 + (partialRuns / runs.length) * 12;
    percent = Math.max(0, Math.min(100, acceptRate - statusPenalty));
  } else {
    const okRatio =
      runs.filter((r) => r.status === "completed").length / runs.length;
    percent = Math.round(okRatio * 100);
  }

  const badge =
    percent >= 90
      ? "Excelente"
      : percent >= 75
        ? "Bom"
        : percent >= 50
          ? "Atenção"
          : "Crítico";

  return {
    percent,
    badge,
    description:
      "Estimativa visual a partir de aceitação de registros e status dos runs — não altera motores financeiros.",
    placeholder: false,
    factors: [
      {
        label: "Registros completos",
        value: imported.toLocaleString("pt-BR"),
      },
      {
        label: "Registros incompletos / rejeitados",
        value: rejected.toLocaleString("pt-BR"),
      },
      {
        label: "Duplicidades",
        value: "—",
        placeholder: true,
      },
      {
        label: "Necessidade de confirmação",
        value: String(previewRuns + partialRuns),
      },
      {
        label: "Inconsistências (runs failed)",
        value: String(failedRuns),
      },
    ],
  };
}

/** Timeline narrativa derivada de um run (sem eventos granulares na engine). */
export function buildRunTimeline(
  run: ImportHistoryEntry | null,
): IntelligenceTimelineEvent[] {
  if (!run) return [];

  const end = new Date(run.createdAt);
  const duration = run.durationMs ?? 60_000;
  const start = new Date(end.getTime() - duration);
  const mid1 = new Date(start.getTime() + duration * 0.2);
  const mid2 = new Date(start.getTime() + duration * 0.45);
  const mid3 = new Date(start.getTime() + duration * 0.7);
  const mid4 = new Date(start.getTime() + duration * 0.85);

  const classified = run.importedRows;
  const awaiting = Math.max(
    0,
    run.rejectedRows || run.totalRows - run.importedRows,
  );

  const finalStatus: IntelligenceTimelineEvent["status"] =
    run.status === "failed"
      ? "error"
      : run.status === "partial" || run.status === "preview"
        ? "warning"
        : run.status === "rolled_back"
          ? "warning"
          : "done";

  return [
    {
      id: `${run.id}-recv`,
      timeLabel: formatClock(start.toISOString()),
      title: "Arquivo recebido",
      status: "done",
      durationLabel: null,
    },
    {
      id: `${run.id}-val`,
      timeLabel: formatClock(mid1.toISOString()),
      title: "Arquivo validado",
      status: "done",
      durationLabel: formatDurationMs(duration * 0.2),
    },
    {
      id: `${run.id}-an`,
      timeLabel: formatClock(mid2.toISOString()),
      title: `${run.totalRows.toLocaleString("pt-BR")} registros analisados`,
      status: "done",
      durationLabel: formatDurationMs(duration * 0.25),
    },
    {
      id: `${run.id}-cls`,
      timeLabel: formatClock(mid3.toISOString()),
      title: `${classified.toLocaleString("pt-BR")} classificados / aceitos`,
      status: classified > 0 ? "done" : "pending",
      durationLabel: formatDurationMs(duration * 0.25),
    },
    {
      id: `${run.id}-wait`,
      timeLabel: formatClock(mid4.toISOString()),
      title:
        awaiting > 0
          ? `${awaiting.toLocaleString("pt-BR")} aguardando confirmação / rejeitados`
          : "Sem pendências de confirmação",
      status: awaiting > 0 ? "warning" : "done",
      durationLabel: null,
    },
    {
      id: `${run.id}-end`,
      timeLabel: formatClock(end.toISOString()),
      title:
        run.status === "rolled_back"
          ? "Importação revertida (rollback)"
          : run.status === "completed"
            ? "Importação concluída"
            : `Importação · ${run.status}`,
      status: finalStatus,
      durationLabel: formatDurationMs(run.durationMs),
    },
  ];
}

export function learningOriginLabel(source: ImportLearningRule["source"]): string {
  switch (source) {
    case "user_confirm":
      return "Confirmação do utilizador";
    case "user_edit":
      return "Edição manual";
    case "auto_learned":
      return "Aprendizado automático";
    case "seed":
      return "Seed / sistema";
    default:
      return source;
  }
}

export function rollbackAvailable(run: ImportHistoryEntry): boolean {
  if (run.status === "rolled_back") return false;
  if (run.status === "preview") return false;
  return run.status === "completed" || run.status === "partial" || run.status === "failed";
}

/** Agregação de qualidade a partir de runs reais — sem números inventados. */
export type DataQualitySummary = {
  totalRuns: number;
  byStatus: Record<ImportHistoryEntry["status"], number>;
  totalRows: number;
  importedRows: number;
  rejectedRows: number;
  errorCount: number;
  empty: boolean;
};

const EMPTY_STATUS_COUNTS: Record<ImportHistoryEntry["status"], number> = {
  preview: 0,
  completed: 0,
  failed: 0,
  partial: 0,
  rolled_back: 0,
};

export function buildDataQualitySummary(
  runs: ImportHistoryEntry[],
  totalKnown?: number,
): DataQualitySummary {
  const byStatus = { ...EMPTY_STATUS_COUNTS };
  for (const run of runs) {
    byStatus[run.status] = (byStatus[run.status] ?? 0) + 1;
  }

  return {
    totalRuns: totalKnown ?? runs.length,
    byStatus,
    totalRows: runs.reduce((a, r) => a + (r.totalRows || 0), 0),
    importedRows: runs.reduce((a, r) => a + (r.importedRows || 0), 0),
    rejectedRows: runs.reduce((a, r) => a + (r.rejectedRows || 0), 0),
    errorCount: runs.reduce((a, r) => a + (r.errorCount || 0), 0),
    empty: runs.length === 0,
  };
}
