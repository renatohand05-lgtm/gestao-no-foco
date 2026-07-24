import Link from "next/link";

import {
  EXECUTIVE_AI_BADGE,
  EXECUTIVE_AI_HEALTH_LABEL,
  EXECUTIVE_AI_MODULE_LABEL,
  EXECUTIVE_AI_NOTE,
  EXECUTIVE_AI_SEVERITY_LABEL,
  EXECUTIVE_AI_TITLE,
  executiveAiPartialLabel,
  formatExecutiveConfidence,
  formatExecutiveScore,
} from "@/lib/ai/executive-ai-summary";
import type { ExecutiveAiResult } from "@/lib/ai/executive-ai-types";
import { EXECUTIVE_BLOCK } from "@/lib/dashboard/executive-ui";
import { exAnimations, exRadius, exTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  data: ExecutiveAiResult;
};

const HEALTH_BADGE: Record<string, string> = {
  excelente:
    "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200",
  saudavel: "bg-sky-100 text-sky-900 dark:bg-sky-950/40 dark:text-sky-200",
  atencao:
    "bg-orange-100 text-orange-900 dark:bg-orange-950/40 dark:text-orange-200",
  critico: "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300",
  indisponivel: "bg-muted text-muted-foreground",
};

/**
 * IA Executiva — card compacto (regras determinísticas, sem LLM).
 */
export function ExecutiveAiCard({ data }: Props) {
  const partialLabel = executiveAiPartialLabel(data);
  const updated = new Date(data.generatedAt).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });

  return (
    <section
      className={cn(
        "border bg-card p-4 sm:p-5 space-y-4",
        exRadius[20],
        exAnimations.fade,
      )}
      data-dashboard-block="ia-executiva"
      aria-label={EXECUTIVE_AI_TITLE}
    >
      <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className={cn(exTypography.title, "text-base sm:text-lg")}>
              {EXECUTIVE_AI_TITLE}
            </h2>
            <span className="rounded-md border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {EXECUTIVE_AI_BADGE}
            </span>
            {partialLabel ? (
              <span className="rounded-md border border-amber-300/70 bg-amber-50/60 px-2 py-0.5 text-[11px] font-medium text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
                {partialLabel}
              </span>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground" title={EXECUTIVE_AI_NOTE}>
            {EXECUTIVE_AI_NOTE}
          </p>
        </div>
        <p className="text-xs text-muted-foreground shrink-0">
          Atualizado: {updated}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border p-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Executive Score
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {formatExecutiveScore(data.executiveScore)}
          </p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Saúde Executiva
          </p>
          <p className="mt-1">
            <span
              className={cn(
                "inline-flex rounded-md px-2 py-0.5 text-sm font-medium",
                HEALTH_BADGE[data.health] ?? HEALTH_BADGE.indisponivel,
              )}
            >
              {EXECUTIVE_AI_HEALTH_LABEL[data.health]}
            </span>
          </p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Cobertura
          </p>
          <p className="mt-1 text-sm font-medium tabular-nums">
            {formatExecutiveConfidence(data.confidence)}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-dashed p-3 space-y-1">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Prioridade máxima
        </p>
        <p className="text-sm font-medium">{data.priority.title}</p>
        <p className="text-xs text-muted-foreground">{data.priority.reason}</p>
        {data.priority.href ? (
          <Link
            href={data.priority.href}
            className="text-xs text-primary underline-offset-2 hover:underline"
          >
            Abrir
          </Link>
        ) : null}
      </div>

      {data.moduleScores.length > 0 ? (
        <ul className="flex flex-wrap gap-2 text-xs">
          {data.moduleScores.map((m) => (
            <li
              key={m.module}
              className="rounded-md border px-2 py-1 tabular-nums text-muted-foreground"
            >
              {EXECUTIVE_AI_MODULE_LABEL[m.module]}:{" "}
              {m.score == null ? "Indisponível" : Math.round(m.score)}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-2 min-w-0">
          <h3 className={cn(EXECUTIVE_BLOCK.title, "text-sm")}>
            Diagnósticos
          </h3>
          {data.diagnostics.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum diagnóstico com evidência neste momento.
            </p>
          ) : (
            <ul className="space-y-2">
              {data.diagnostics.map((d) => (
                <li key={d.id} className="rounded-lg border p-3 space-y-1">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {EXECUTIVE_AI_SEVERITY_LABEL[d.severity]} ·{" "}
                    {EXECUTIVE_AI_MODULE_LABEL[d.module]}
                  </p>
                  <p className="text-sm font-medium">{d.title}</p>
                  <p className="text-xs text-muted-foreground">{d.description}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Evidência: {d.evidence.join("; ")}
                  </p>
                  {d.href ? (
                    <Link
                      href={d.href}
                      className="text-xs text-primary underline-offset-2 hover:underline"
                    >
                      Ver detalhes
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-2 min-w-0">
          <h3 className={cn(EXECUTIVE_BLOCK.title, "text-sm")}>
            Recomendações
          </h3>
          {data.recommendations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma recomendação derivada.
            </p>
          ) : (
            <ol className="space-y-2">
              {data.recommendations.map((r) => (
                <li key={r.id} className="rounded-lg border p-3 space-y-1">
                  <p className="text-[11px] text-muted-foreground">
                    Prioridade {r.priority} · {EXECUTIVE_AI_MODULE_LABEL[r.module]}
                  </p>
                  <p className="text-sm font-medium">{r.action}</p>
                  <p className="text-xs text-muted-foreground">
                    Motivo: {r.reason}
                  </p>
                  {r.href ? (
                    <Link
                      href={r.href}
                      className="text-xs text-primary underline-offset-2 hover:underline"
                    >
                      Ir para ação
                    </Link>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      {data.unavailableSources.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          Fontes indisponíveis:{" "}
          {data.unavailableSources
            .map((m) => EXECUTIVE_AI_MODULE_LABEL[m])
            .join(", ")}
          .
        </p>
      ) : null}
    </section>
  );
}
