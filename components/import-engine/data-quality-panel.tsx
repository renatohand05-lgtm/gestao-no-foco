import Link from "next/link";
import { BarChart3 } from "lucide-react";

import { ExecutiveBadge } from "@/components/executive/ExecutiveBadge";
import { EmptyState } from "@/components/ui/empty-state";
import { gofMotion } from "@/lib/design-system";
import { cn } from "@/lib/utils";
import type { DataQualitySummary } from "./intelligence-presentation";

const STATUS_LABELS: Record<string, string> = {
  completed: "Concluídos",
  failed: "Falha",
  partial: "Parcial",
  preview: "Preview",
  rolled_back: "Revertidos",
};

type Props = {
  summary: DataQualitySummary;
  tenantSlug: string;
  className?: string;
  compact?: boolean;
};

/**
 * Painel de qualidade derivado exclusivamente de runs reais.
 */
export function DataQualityPanel({
  summary,
  tenantSlug,
  className,
  compact = false,
}: Props) {
  if (summary.empty) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Sem dados de qualidade"
        description="Importe ficheiros ou aguarde runs concluídos para ver métricas de qualidade reais."
        action={{
          label: "Importar agora",
          href: `/${tenantSlug}/integracoes/importar`,
        }}
        className={className}
      />
    );
  }

  const statusEntries = Object.entries(summary.byStatus).filter(
    ([, count]) => count > 0,
  );

  return (
    <section
      aria-label="Qualidade dos dados de importação"
      data-data-quality-panel
      className={cn(
        "rounded-xl border border-border/60 bg-card/40 p-4",
        gofMotion.fade,
        className,
      )}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">
            Qualidade dos Dados
          </h2>
          <p className="text-xs text-muted-foreground">
            Agregado de {summary.totalRuns} run(s) — números reais, sem estimativas
            inventadas.
          </p>
        </div>
        {!compact ? (
          <Link
            href={`/${tenantSlug}/integracoes/qualidade`}
            className="text-xs underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Ver detalhes
          </Link>
        ) : null}
      </div>

      <div
        className={cn(
          "grid gap-3",
          compact ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-4",
        )}
      >
        <Metric label="Registros totais" value={summary.totalRows} />
        <Metric label="Importados" value={summary.importedRows} tone="success" />
        <Metric label="Rejeitados" value={summary.rejectedRows} tone="warning" />
        <Metric label="Erros reportados" value={summary.errorCount} tone="danger" />
      </div>

      {statusEntries.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {statusEntries.map(([status, count]) => (
            <ExecutiveBadge
              key={status}
              tone={
                status === "completed"
                  ? "success"
                  : status === "failed"
                    ? "danger"
                    : status === "partial"
                      ? "warning"
                      : "neutral"
              }
              variant="soft"
            >
              {STATUS_LABELS[status] ?? status}: {count}
            </ExecutiveBadge>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function Metric({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  return (
    <div className="rounded-lg border border-border/50 bg-background/50 px-3 py-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p
        className={cn(
          "text-lg font-semibold tabular-nums",
          tone === "success" && "text-emerald-700 dark:text-emerald-400",
          tone === "warning" && "text-amber-700 dark:text-amber-400",
          tone === "danger" && "text-red-700 dark:text-red-400",
        )}
      >
        {value.toLocaleString("pt-BR")}
      </p>
    </div>
  );
}
