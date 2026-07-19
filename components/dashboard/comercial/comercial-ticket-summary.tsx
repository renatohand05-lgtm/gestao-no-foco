import Link from "next/link";

import { COMERCIAL_METRIC_ICONS } from "@/components/dashboard/comercial/comercial-metric-icons";
import { buildDashboardDrillDownHref } from "@/lib/dashboard/drill-down";
import {
  formatCurrency,
  formatNumber,
  formatPercent,
} from "@/lib/dashboard/format";
import {
  ExecutiveCard,
  ExecutiveMetric,
  ExecutiveSection,
} from "@/components/executive";
import { exAnimations, exSpacing } from "@/lib/design-system";
import { cn } from "@/lib/utils";
import type { CommercialPanelData } from "@/types/commercial-panel";
import type { DashboardFilters } from "@/types/dashboard-executive";
import type { ComercialMetricIconKey } from "@/components/dashboard/comercial/comercial-metric-icons";
import type { ExColorTone } from "@/lib/design-system/colors";

type Props = {
  tenantSlug: string;
  data: CommercialPanelData;
  filters: DashboardFilters;
};

function MetricCard({
  label,
  value,
  href,
  hint,
  icon,
  size = "secondary",
  tone = "neutral",
}: {
  label: string;
  value: string;
  href?: string;
  hint?: string;
  icon?: ComercialMetricIconKey;
  size?: "primary" | "secondary";
  tone?: ExColorTone;
}) {
  const Icon = icon ? COMERCIAL_METRIC_ICONS[icon] : undefined;
  const body = (
    <ExecutiveCard
      padding={size === "primary" ? 20 : 16}
      className={cn(
        "h-full",
        exAnimations.slide,
        href && exAnimations.hoverLift,
      )}
    >
      <ExecutiveMetric
        label={label}
        value={value}
        hint={hint}
        icon={Icon}
        size={size}
        tone={tone}
      />
    </ExecutiveCard>
  );
  if (!href) return body;
  return (
    <Link href={href} className={cn("block h-full", exAnimations.focusRing)}>
      {body}
    </Link>
  );
}

export function ComercialTicketSummary({ tenantSlug, data, filters }: Props) {
  const monthFilters: DashboardFilters = {
    ...filters,
    dataDe: data.dataDe,
    dataAte: data.dataAte,
  };
  const vendasHref = buildDashboardDrillDownHref(
    tenantSlug,
    "vendas",
    monthFilters,
  );

  const description = `Fonte: vendas faturadas (total ÷ quantidade) — mesmo critério do Dashboard.${
    !data.auditoria.tem_meta_ticket
      ? " Meta de ticket ainda não cadastrada (sem campo dedicado)."
      : ""
  }`;

  return (
    <ExecutiveSection title="Ticket médio" description={description}>
      <div
        className={cn(
          "grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
          exSpacing[16],
        )}
      >
        <MetricCard
          size="primary"
          icon="ticket"
          href={vendasHref}
          label="Ticket atual"
          value={formatCurrency(data.ticket.ticket_medio_atual)}
          tone="primary"
        />
        <MetricCard
          icon="comparacao"
          label="Ticket anterior"
          value={formatCurrency(data.ticket.ticket_medio_anterior)}
        />
        <MetricCard
          icon="tendencia"
          label="Variação"
          value={
            data.ticket.variacao_pct === null
              ? "—"
              : formatPercent(data.ticket.variacao_pct)
          }
          tone={
            data.ticket.variacao_pct === null
              ? "neutral"
              : data.ticket.variacao_pct >= 0
                ? "success"
                : "danger"
          }
        />
        <MetricCard
          icon="dias"
          label="Qtd. vendas"
          value={formatNumber(data.ticket.quantidade_vendas)}
        />
        <MetricCard
          icon="meta"
          label="Meta de ticket"
          value="—"
          hint="Não cadastrada (sem campo dedicado)"
        />
        <MetricCard
          icon="gap"
          label="Impacto no faturamento"
          value={
            data.ticket.impacto_faturamento_estimado === null
              ? "—"
              : formatCurrency(data.ticket.impacto_faturamento_estimado)
          }
        />
      </div>
    </ExecutiveSection>
  );
}
