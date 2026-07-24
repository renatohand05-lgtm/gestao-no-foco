import { DashboardRefreshButton } from "@/components/dashboard/dashboard-refresh-button";
import { ExecutiveBadge, ExecutiveHeader, ExecutivePanel } from "@/components/executive";
import {
  META_DIA_STATUS_LABEL,
  type MetaDiaStatus,
} from "@/lib/dashboard/faturamento-agregacao";
import { gofMotion, gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  greeting: string;
  tenantName: string;
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

function statusTone(
  status: MetaDiaStatus,
): "success" | "warning" | "danger" | "neutral" {
  switch (status) {
    case "superada":
    case "atingida":
      return "success";
    case "atencao":
      return "warning";
    case "abaixo":
      return "danger";
    default:
      return "neutral";
  }
}

/**
 * Cabeçalho do Dashboard Executivo — DS oficial (Gate 19.1).
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
    <ExecutivePanel className={cn(gofMotion.fade)}>
      <ExecutiveHeader
        title={greeting}
        description={`Visão executiva de hoje · ${tenantName}`}
        actions={
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <ExecutiveBadge tone={statusTone(status)}>
              Meta do dia · {META_DIA_STATUS_LABEL[status]}
            </ExecutiveBadge>
            <DashboardRefreshButton updatedAtLabel={updatedAtLabel} />
          </div>
        }
      />
      <p className={cn(gofTypography.caption, "mt-2 capitalize")}>{dateLabel}</p>
    </ExecutivePanel>
  );
}
