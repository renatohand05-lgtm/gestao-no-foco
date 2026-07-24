import Link from "next/link";

import {
  ExecutiveBadge,
  ExecutiveCard,
  ExecutiveEmptyState,
  ExecutivePanel,
  ExecutiveSection,
} from "@/components/executive";
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
import { gofGrid, gofMotion, gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  data: ExecutiveAiResult;
};

function healthTone(
  health: ExecutiveAiResult["health"],
): "success" | "warning" | "danger" | "neutral" | "info" {
  if (health === "excelente") return "success";
  if (health === "saudavel") return "info";
  if (health === "atencao") return "warning";
  if (health === "critico") return "danger";
  return "neutral";
}

/**
 * IA Executiva — Design System oficial (Gate 19.1).
 */
export function ExecutiveAiCard({ data }: Props) {
  const partialLabel = executiveAiPartialLabel(data);
  const updated = new Date(data.generatedAt).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });

  return (
    <div data-dashboard-block="ia-executiva" className={gofMotion.fade}>
      <ExecutiveSection
        title={EXECUTIVE_AI_TITLE}
        description={EXECUTIVE_AI_NOTE}
        panel
        className="space-y-5"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ExecutiveBadge tone="neutral" variant="outline">
              {EXECUTIVE_AI_BADGE}
            </ExecutiveBadge>
            {partialLabel ? (
              <ExecutiveBadge tone="warning" variant="soft">
                {partialLabel}
              </ExecutiveBadge>
            ) : null}
            <span className={gofTypography.caption}>Atualizado: {updated}</span>
          </div>
        }
      >
        <div className={gofGrid.threeCol}>
          <MetricBlock
            label="Executive Score"
            value={formatExecutiveScore(data.executiveScore)}
            emphasize
          />
          <div className="rounded-lg border border-border/60 bg-background/50 p-4 sm:p-5">
            <p
              className={cn(
                gofTypography.caption,
                "uppercase tracking-[0.1em] text-muted-foreground",
              )}
            >
              Saúde Executiva
            </p>
            <p className="mt-3">
              <ExecutiveBadge tone={healthTone(data.health)} variant="soft">
                {EXECUTIVE_AI_HEALTH_LABEL[data.health]}
              </ExecutiveBadge>
            </p>
          </div>
          <MetricBlock
            label="Cobertura"
            value={formatExecutiveConfidence(data.confidence)}
            compact
          />
        </div>

        <ExecutivePanel
          className="border-dashed"
          header={<p className={gofTypography.caption}>Prioridade máxima</p>}
        >
          <p className={cn(gofTypography.title, "text-base")}>
            {data.priority.title}
          </p>
          <p className={cn(gofTypography.subtitle, "mt-1")}>
            {data.priority.reason}
          </p>
          {data.priority.href ? (
            <Link
              href={data.priority.href}
              className="mt-2 inline-block text-xs font-medium text-primary underline-offset-2 hover:underline"
            >
              Abrir
            </Link>
          ) : null}
        </ExecutivePanel>

        {data.moduleScores.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {data.moduleScores.map((m) => (
              <li key={m.module}>
                <ExecutiveBadge tone="neutral" variant="outline">
                  {EXECUTIVE_AI_MODULE_LABEL[m.module]}:{" "}
                  {m.score == null ? "Indisponível" : Math.round(m.score)}
                </ExecutiveBadge>
              </li>
            ))}
          </ul>
        ) : null}

        <div className={cn(gofGrid.twoCol)}>
          <div className="min-w-0 space-y-2">
            <h3 className={gofTypography.title}>Diagnósticos</h3>
            {data.diagnostics.length === 0 ? (
              <ExecutiveEmptyState
                title="Nenhum diagnóstico"
                description="Nenhuma evidência crítica neste momento."
                className="py-8"
              />
            ) : (
              <ul className="space-y-2">
                {data.diagnostics.map((d) => (
                  <li key={d.id}>
                <ExecutiveCard padding={16} className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <ExecutiveBadge
                          tone={
                            d.severity === "critica" || d.severity === "alta"
                              ? "danger"
                              : d.severity === "media"
                                ? "warning"
                                : d.severity === "oportunidade"
                                  ? "success"
                                  : "info"
                          }
                          variant="soft"
                        >
                          {EXECUTIVE_AI_SEVERITY_LABEL[d.severity]}
                        </ExecutiveBadge>
                        <ExecutiveBadge tone="neutral" variant="outline">
                          {EXECUTIVE_AI_MODULE_LABEL[d.module]}
                        </ExecutiveBadge>
                      </div>
                      <p className="text-sm font-semibold">{d.title}</p>
                      <p className={cn(gofTypography.subtitle, "line-clamp-3")}>
                        {d.description}
                      </p>
                      {d.href ? (
                        <Link
                          href={d.href}
                          className="text-xs font-medium text-primary underline-offset-2 hover:underline"
                        >
                          Ver detalhes
                        </Link>
                      ) : null}
                    </ExecutiveCard>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="min-w-0 space-y-2">
            <h3 className={gofTypography.title}>Recomendações</h3>
            {data.recommendations.length === 0 ? (
              <p className={gofTypography.subtitle}>
                Nenhuma recomendação derivada.
              </p>
            ) : (
              <ol className="space-y-2">
                {data.recommendations.map((r) => (
                  <li key={r.id}>
                    <ExecutiveCard padding={16} className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <ExecutiveBadge tone="primary" variant="soft">
                          Prioridade {r.priority}
                        </ExecutiveBadge>
                        <ExecutiveBadge tone="neutral" variant="outline">
                          {EXECUTIVE_AI_MODULE_LABEL[r.module]}
                        </ExecutiveBadge>
                      </div>
                      <p className="text-sm font-semibold">{r.action}</p>
                      <p className={cn(gofTypography.subtitle, "line-clamp-2")}>
                        {r.reason}
                      </p>
                      {r.href ? (
                        <Link
                          href={r.href}
                          className="text-xs font-medium text-primary underline-offset-2 hover:underline"
                        >
                          Ir para ação
                        </Link>
                      ) : null}
                    </ExecutiveCard>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        {data.unavailableSources.length > 0 ? (
          <p className={gofTypography.caption}>
            Fontes indisponíveis:{" "}
            {data.unavailableSources
              .map((m) => EXECUTIVE_AI_MODULE_LABEL[m])
              .join(", ")}
            .
          </p>
        ) : null}
      </ExecutiveSection>
    </div>
  );
}

function MetricBlock({
  label,
  value,
  compact,
  emphasize,
}: {
  label: string;
  value: string;
  compact?: boolean;
  emphasize?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/50 p-4 sm:p-5">
      <p
        className={cn(
          gofTypography.caption,
          "uppercase tracking-[0.1em] text-muted-foreground",
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          "mt-2 font-semibold tabular-nums tracking-tight text-foreground",
          compact ? "text-lg" : emphasize ? "text-3xl sm:text-4xl" : "text-2xl",
        )}
      >
        {value}
      </p>
    </div>
  );
}
