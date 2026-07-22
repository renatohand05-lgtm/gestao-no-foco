import { DashboardRefreshButton } from "@/components/dashboard/dashboard-refresh-button";
import {
  META_DIA_STATUS_LABEL,
  type MetaDiaStatus,
} from "@/lib/dashboard/faturamento-agregacao";
import {
  exAnimations,
  exColors,
  exRadius,
  exShadow,
  exTypography,
} from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  greeting: string;
  tenantName: string;
  /** Data civil YYYY-MM-DD (timezone do tenant). */
  dataHoje: string;
  updatedAtLabel: string;
  status: MetaDiaStatus;
};

function formatLongDate(civilDate: string) {
  const [y, m, d] = civilDate.split("-").map(Number);
  if (!y || !m || !d) return civilDate;
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function statusTone(status: MetaDiaStatus) {
  switch (status) {
    case "superada":
    case "atingida":
      return exColors.success.soft;
    case "atencao":
      return exColors.warning.soft;
    case "abaixo":
      return exColors.danger.soft;
    default:
      return "bg-muted/70 text-muted-foreground";
  }
}

/**
 * Cabeçalho compacto do Dashboard Executivo (Sprint 16 Gate 16.1).
 */
export function ExecutiveDashboardHeader({
  greeting,
  tenantName,
  dataHoje,
  updatedAtLabel,
  status,
}: Props) {
  const dateLabel = formatLongDate(dataHoje);

  return (
    <header
      className={cn(
        "flex flex-col gap-3 border border-border/50 bg-card px-5 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-6",
        exRadius[16],
        exShadow.card,
        exAnimations.fade,
      )}
      aria-label="Cabeçalho executivo"
    >
      <div className="min-w-0 space-y-1">
        <p className={cn(exTypography.heading, "truncate leading-tight")}>
          {greeting}
        </p>
        <p className={cn(exTypography.subtitle, "truncate")}>
          Visão executiva de hoje · {tenantName}
        </p>
        <p className={cn(exTypography.caption, "capitalize")}>{dateLabel}</p>
      </div>

      <div className="flex min-w-0 flex-col items-start gap-2 sm:items-end">
        <span
          className={cn(
            "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
            statusTone(status),
          )}
          aria-label={`Status operacional: ${META_DIA_STATUS_LABEL[status]}`}
        >
          Meta do dia · {META_DIA_STATUS_LABEL[status]}
        </span>
        <DashboardRefreshButton updatedAtLabel={updatedAtLabel} />
      </div>
    </header>
  );
}
