import { DashboardRefreshButton } from "@/components/dashboard/dashboard-refresh-button";
import { ExecutiveBadge, ExecutiveHeader, ExecutivePanel } from "@/components/executive";
import {
  META_DIA_STATUS_LABEL,
  type MetaDiaStatus,
} from "@/lib/dashboard/faturamento-agregacao";
import { gofMotion, gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  /** Mantido na API por compatibilidade; saudação exclusiva do Hero. */
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
 * Faixa de contexto do Cockpit — sem saudação (Gate 20.1.1).
 * Greeting / Score / saúde ficam no Hero do Intelligence Center.
 */
export function ExecutiveDashboardHeader({
  greeting: _greeting,
  tenantName,
  dataHoje,
  updatedAtLabel,
  status,
}: Props) {
  void _greeting;
  const dateLabel = formatLongDate(dataHoje);

  return (
    <div data-dashboard-block="executive-header" className={gofMotion.fade}>
      <ExecutivePanel>
        <ExecutiveHeader
          title="Cockpit Executivo"
          description={tenantName}
          actions={
            <DashboardRefreshButton updatedAtLabel={updatedAtLabel} />
          }
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <p className={cn(gofTypography.caption, "capitalize")}>{dateLabel}</p>
          <ExecutiveBadge tone={statusTone(status)} variant="outline">
            Meta do dia · {META_DIA_STATUS_LABEL[status]}
          </ExecutiveBadge>
        </div>
      </ExecutivePanel>
    </div>
  );
}
