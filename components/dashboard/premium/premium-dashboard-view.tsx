import type { ReactNode } from "react";
import Link from "next/link";

import { BrandInstitutionalFooter } from "@/components/brand/brand-institutional-footer";
import { DashboardQuickActions } from "@/components/dashboard/dashboard-quick-actions";
import { ExecutiveDashboardHeader } from "@/components/dashboard/executive/executive-dashboard-header";
import { PremiumDisclosure } from "@/components/dashboard/premium/premium-disclosure";
import {
  PremiumAlertsRail,
  PremiumMainRow,
} from "@/components/dashboard/premium/premium-main-row";
import {
  PremiumKpiStrip,
  PremiumOpsStrip,
} from "@/components/dashboard/premium/premium-kpi-strip";
import type { DashboardHojeSnapshot } from "@/lib/dashboard/vendas-dia-service";
import type {
  DashboardCharts,
  DashboardPrimaryData,
} from "@/types/dashboard-executive";
import type { ExecutiveDecisionResult } from "@/lib/dashboard/executive-decision-types";
import type { ExecutiveFinancialCockpitData } from "@/lib/dashboard/executive-financial-cockpit-types";
import type { ExecutiveIntelligenceData } from "@/lib/dashboard/executive-intelligence-types";
import {
  buildPremiumInsights,
  buildPremiumOpsCards,
  buildPremiumTopKpis,
} from "@/lib/dashboard/premium-dashboard-map";
import { cn } from "@/lib/utils";

type Props = {
  tenantSlug: string;
  tenantName: string;
  greeting: string;
  hoje: DashboardHojeSnapshot;
  primary: DashboardPrimaryData | null;
  charts: DashboardCharts | null;
  cockpit: ExecutiveFinancialCockpitData;
  intelligence: ExecutiveIntelligenceData;
  decision: ExecutiveDecisionResult;
  estoqueAbaixoMinimo: number | null;
  periodoLabel: string;
  aiSlot: ReactNode;
};

/**
 * Dashboard premium — Sprint 25.7: motion de entrada, DS tokens, sem inventar.
 */
export function PremiumDashboardView({
  tenantSlug,
  tenantName,
  greeting,
  hoje,
  primary,
  charts,
  cockpit,
  intelligence,
  decision,
  estoqueAbaixoMinimo,
  periodoLabel,
  aiSlot,
}: Props) {
  const kpis = buildPremiumTopKpis({ primary, hoje, tenantSlug });
  const insights = buildPremiumInsights({
    cockpit,
    intelligence,
    decision,
    estoqueAbaixoMinimo,
    primary,
    tenantSlug,
  });
  const ops = buildPremiumOpsCards({
    hoje,
    primary,
    intelligence,
    estoqueAbaixoMinimo,
    tenantSlug,
  });

  const alertCount = insights.filter(
    (i) => i.severity === "danger" || i.severity === "warning",
  ).length;

  return (
    <div
      className="relative space-y-5 lg:space-y-6"
      data-dashboard-premium-v251=""
      data-dashboard-premium-v256=""
      data-dashboard-premium-v2561=""
      data-dashboard-premium-v257=""
      data-dashboard-block="premium-v251"
      data-dashboard-layout="premium-root"
      data-premium-motion="dashboard-entrance"
    >
      <div
        className="pointer-events-none absolute -top-10 left-1/2 h-56 w-[min(100%,56rem)] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(201,168,76,0.14),transparent_70%)]"
        aria-hidden
      />

      <div className="relative space-y-5 lg:space-y-6">
        <div className="premium-enter premium-enter-delay-1">
          <ExecutiveDashboardHeader
            greeting={greeting}
            tenantName={tenantName}
            dataHoje={hoje.data_hoje}
            updatedAtLabel={hoje.atualizado_em_label}
            status={hoje.hoje.status}
          />
        </div>

        {/* Linha 1 — KPIs */}
        <div className="premium-enter premium-enter-delay-2">
          <PremiumKpiStrip items={kpis} />
        </div>

        {/* Linha 2 — gráfico · inteligência · fluxo */}
        <div className="premium-enter premium-enter-delay-3">
          <PremiumMainRow
            faturamentoDiario={charts?.faturamentoDiario ?? []}
            receitasVsDespesas={
              charts?.receitasVsDespesas ??
              primary?.fluxoCharts.receitasVsDespesas ??
              []
            }
            insights={insights}
            cockpit={cockpit}
            tenantSlug={tenantSlug}
            periodoLabel={periodoLabel}
          />
        </div>

        {/* Linha 3 — ops */}
        <div className="premium-enter premium-enter-delay-4">
          <PremiumOpsStrip items={ops} />
        </div>

        {/* Linhas 4–5 — progressive disclosure */}
        <div className="premium-enter premium-enter-delay-5">
          <PremiumDisclosure
            panels={[
              {
                id: "alertas",
                title: "Alertas e calendário fiscal",
                summary:
                  alertCount > 0
                    ? `${alertCount} alerta(s) de atenção neste ciclo`
                    : "Sem alertas críticos · calendário sob demanda",
                defaultOpen: alertCount > 0,
                children: (
                  <PremiumAlertsRail
                    insights={insights}
                    tenantSlug={tenantSlug}
                  />
                ),
              },
              {
                id: "ia",
                title: "Command Center · Inteligência executiva",
                summary:
                  "Análise baseada em regras, métricas e histórico do tenant.",
                defaultOpen: false,
                children: (
                  <div
                    data-premium-block="ask-ai"
                    className={cn(
                      "rounded-xl border border-[var(--border-premium)] bg-[var(--surface-raised)]/80 p-3",
                      "dark:bg-[var(--brand-navy)]/40",
                    )}
                  >
                    <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                      <p className="text-xs text-[var(--text-secondary)]">
                        Sem simular provider externo. Abra para o cockpit
                        completo.
                      </p>
                      <Link
                        href={`/${tenantSlug}/dashboard`}
                        className="text-xs text-[var(--brand-gold)] hover:underline"
                      >
                        Atualizar ciclo
                      </Link>
                    </div>
                    {aiSlot}
                  </div>
                ),
              },
              {
                id: "atalhos",
                title: "Atalhos executivos",
                summary: "Ações rápidas para operação do dia",
                defaultOpen: false,
                children: (
                  <section data-premium-block="atalhos">
                    <DashboardQuickActions tenantSlug={tenantSlug} />
                  </section>
                ),
              },
            ]}
          />
        </div>

        <BrandInstitutionalFooter compact />
      </div>
    </div>
  );
}
