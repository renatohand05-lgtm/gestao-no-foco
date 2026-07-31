import type { ReactNode } from "react";
import Link from "next/link";

import { BrandInstitutionalFooter } from "@/components/brand/brand-institutional-footer";
import { DashboardQuickActions } from "@/components/dashboard/dashboard-quick-actions";
import { ExecutiveBrief } from "@/components/dashboard/premium/executive-brief";
import { PremiumDisclosure } from "@/components/dashboard/premium/premium-disclosure";
import {
  PremiumAlertsRail,
  PremiumMainRow,
} from "@/components/dashboard/premium/premium-main-row";
import { PremiumOpsStrip, PremiumKpiStrip } from "@/components/dashboard/premium/premium-kpi-strip";
import { GFExecutiveHeader } from "@/components/gf/gf-executive-header";
import type { DashboardHojeSnapshot } from "@/lib/dashboard/vendas-dia-service";
import type {
  DashboardCharts,
  DashboardPrimaryData,
} from "@/types/dashboard-executive";
import type { ExecutiveDecisionResult } from "@/lib/dashboard/executive-decision-types";
import type { ExecutiveFinancialCockpitData } from "@/lib/dashboard/executive-financial-cockpit-types";
import type { ExecutiveIntelligenceData } from "@/lib/dashboard/executive-intelligence-types";
import { buildExecutiveBrief } from "@/lib/dashboard/executive-brief";
import {
  buildPremiumInsights,
  buildPremiumOpsCards,
  buildPremiumTopKpis,
} from "@/lib/dashboard/premium-dashboard-map";
import { gfSpace } from "@/lib/design-system/signature";
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

function companyTone(
  saude: ExecutiveFinancialCockpitData["saude"],
): "success" | "warning" | "danger" | "neutral" | "info" {
  if (saude === "saudavel") return "success";
  if (saude === "atencao") return "warning";
  if (saude === "critico") return "danger";
  return "neutral";
}

/**
 * Dashboard premium — Sprint 26.2 Signature Experience.
 * Header autoral → Brief → KPI cockpit unificado → gráfico → ops → disclosure.
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
  const brief = buildExecutiveBrief({
    greeting,
    tenantName,
    hoje,
    cockpit,
    kpis,
    insights,
    tenantSlug,
  });

  const alertCount = insights.filter(
    (i) => i.severity === "danger" || i.severity === "warning",
  ).length;

  return (
    <div
      className={cn("relative", gfSpace.stackSection)}
      data-dashboard-premium-v251=""
      data-dashboard-premium-v256=""
      data-dashboard-premium-v2561=""
      data-dashboard-premium-v257=""
      data-dashboard-premium-v261=""
      data-dashboard-premium-v262=""
      data-dashboard-block="premium-v262"
      data-dashboard-layout="cockpit-hierarchy"
      data-cockpit-hierarchy="brief-kpi-chart-ops"
      data-premium-motion="dashboard-entrance"
      data-brand-continuity="dashboard"
      data-signature="26.2"
    >
      <div
        className="pointer-events-none absolute -top-12 left-1/2 h-64 w-[min(100%,60rem)] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgb(201_168_76_/0.14),transparent_72%)]"
        aria-hidden
      />

      <div className={cn("relative", gfSpace.stackSection)}>
        <div className="premium-enter premium-enter-delay-1 space-y-[var(--gf-space-block)]">
          <GFExecutiveHeader
            greeting={greeting}
            tenantName={tenantName}
            dataHoje={hoje.data_hoje}
            updatedAtLabel={hoje.atualizado_em_label}
            status={hoje.hoje.status}
            companyStatusLabel={cockpit.saudeLabel}
            companyStatusTone={companyTone(cockpit.saude)}
            tenantSlug={tenantSlug}
          />
          <ExecutiveBrief brief={brief} />
        </div>

        <div className="premium-enter premium-enter-delay-2">
          <PremiumKpiStrip items={kpis} dominant />
        </div>

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

        <div className="premium-enter premium-enter-delay-4">
          <PremiumOpsStrip items={ops} />
        </div>

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
                  "Leitura de 5 segundos · evidências sob demanda.",
                defaultOpen: false,
                children: (
                  <div
                    data-premium-block="ask-ai"
                    data-command-center-compact=""
                    className={cn(
                      "gf-surface gf-surface-raised rounded-xl border border-[var(--border-premium)] p-3",
                      "bg-[var(--card)]",
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
                title: "Launcher executivo",
                summary: "Ações rápidas com contexto",
                defaultOpen: false,
                children: (
                  <section data-premium-block="atalhos" data-gf-launcher="">
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
