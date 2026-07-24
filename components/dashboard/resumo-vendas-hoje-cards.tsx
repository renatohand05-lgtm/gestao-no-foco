import {
  Crosshair,
  Receipt,
  ArrowUpRight,
  Percent,
  ShoppingBag,
  Ticket,
} from "lucide-react";

import { DashboardWorkspaceEmpty } from "@/components/dashboard/dashboard-workspace-empty";
import { ExecutiveKpiCard } from "@/components/dashboard/executive/executive-kpi-card";
import { ExecutiveSection } from "@/components/executive";
import { formatCurrency, formatPercent } from "@/lib/dashboard/format";
import type { DashboardHojeSnapshot } from "@/lib/dashboard/vendas-dia-service";
import { cn } from "@/lib/utils";

type Props = {
  data: DashboardHojeSnapshot;
  tenantSlug: string;
};

function signedCurrency(value: number | null) {
  if (value == null) return "—";
  const abs = formatCurrency(Math.abs(value));
  if (value > 0) return `+${abs}`;
  if (value < 0) return `-${abs}`;
  return abs;
}

function isWorkspaceEmpty(data: DashboardHojeSnapshot): boolean {
  const h = data.hoje;
  return (
    h.quantidade_vendas === 0 &&
    h.faturamento === 0 &&
    h.meta == null &&
    data.mes.quantidade_vendas === 0 &&
    data.mes.faturamento === 0
  );
}

/** KPIs do dia — empty elegante sem parede de zeros (Gate 19.4). */
export function ResumoVendasHojeCards({ data, tenantSlug }: Props) {
  const h = data.hoje;
  const diferenca = h.meta == null ? null : h.faturamento - h.meta;
  const excess =
    h.percentual != null && h.percentual > 100 ? h.percentual - 100 : null;

  if (isWorkspaceEmpty(data)) {
    return (
      <ExecutiveSection
        title="Score do dia"
        description="Ative o cockpit com o primeiro movimento real."
        panel
      >
        <DashboardWorkspaceEmpty tenantSlug={tenantSlug} />
      </ExecutiveSection>
    );
  }

  return (
    <ExecutiveSection title="Score do dia" description="Meta, realizado e ritmo comercial de hoje." panel>
      <div className="@container w-full max-w-full min-w-0 overflow-x-hidden">
        <div
          className={cn(
            "grid w-full max-w-full min-w-0",
            "grid-cols-1 gap-5",
            "sm:grid-cols-2",
            "lg:grid-cols-3",
            "@[80rem]:grid-cols-[repeat(6,minmax(0,1fr))] @[80rem]:gap-6",
          )}
        >
          <ExecutiveKpiCard
            icon={Crosshair}
            tone="neutral"
            title="Meta"
            value={h.meta == null ? "—" : formatCurrency(h.meta)}
            supportingText={
              h.meta_fonte === "rateio"
                ? "Rateio da meta mensal"
                : h.meta_fonte === "manual"
                  ? "Meta manual"
                  : h.meta_fonte
            }
          />
          <ExecutiveKpiCard
            icon={Receipt}
            tone="primary"
            title="Realizado"
            value={formatCurrency(h.faturamento)}
            statusLabel={
              h.status === "atingida" || h.status === "superada"
                ? "No ritmo"
                : h.status === "atencao"
                  ? "Atenção"
                  : h.status === "abaixo"
                    ? "Abaixo"
                    : undefined
            }
          />
          <ExecutiveKpiCard
            icon={ArrowUpRight}
            tone={
              diferenca == null
                ? "neutral"
                : diferenca >= 0
                  ? "success"
                  : "danger"
            }
            title="Diferença"
            value={signedCurrency(diferenca)}
          />
          <ExecutiveKpiCard
            icon={Percent}
            tone={
              h.percentual == null
                ? "neutral"
                : h.percentual >= 100
                  ? "success"
                  : h.percentual >= 80
                    ? "primary"
                    : "danger"
            }
            title="% atingido"
            value={h.percentual == null ? "—" : formatPercent(h.percentual)}
            progress={{
              value: h.percentual,
              label:
                excess != null
                  ? `+${formatPercent(excess)} acima da meta`
                  : undefined,
            }}
          />
          <ExecutiveKpiCard
            icon={ShoppingBag}
            tone="neutral"
            title="Quantidade"
            value={String(h.quantidade_vendas)}
          />
          <ExecutiveKpiCard
            icon={Ticket}
            tone="neutral"
            title="Ticket médio"
            value={formatCurrency(h.ticket_medio)}
          />
        </div>
      </div>
    </ExecutiveSection>
  );
}
