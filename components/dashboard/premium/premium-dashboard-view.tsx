import type { ReactNode } from "react";
import Link from "next/link";

import { BrandInstitutionalFooter } from "@/components/brand/brand-institutional-footer";
import { AlertsCenter } from "@/components/dashboard/cockpit-v2/alerts-center";
import { CockpitKpiGrid } from "@/components/dashboard/cockpit-v2/cockpit-kpi-grid";
import { DreCashCards } from "@/components/dashboard/cockpit-v2/dre-cash-cards";
import { EmptyStatesRail } from "@/components/dashboard/cockpit-v2/empty-states-rail";
import { ExecutiveBriefV2 } from "@/components/dashboard/cockpit-v2/executive-brief-v2";
import { MetaPanel } from "@/components/dashboard/cockpit-v2/meta-panel";
import { QuickActionsPanel } from "@/components/dashboard/cockpit-v2/quick-actions-panel";
import { PremiumDisclosure } from "@/components/dashboard/premium/premium-disclosure";
import {
  PremiumAlertsRail,
  PremiumMainRow,
} from "@/components/dashboard/premium/premium-main-row";
import { PremiumOpsStrip } from "@/components/dashboard/premium/premium-kpi-strip";
import { GFExecutiveHeader } from "@/components/gf/gf-executive-header";
import { getSegmentQuickActions } from "@/config/dashboard/cockpit-v2";
import { getSegmentUiCopy } from "@/lib/segments/copy.ts";
import { filterDashboardSurface } from "@/lib/segments/dashboard.ts";
import type { DashboardHojeSnapshot } from "@/lib/dashboard/vendas-dia-service";
import type {
  DashboardCharts,
  DashboardPrimaryData,
} from "@/types/dashboard-executive";
import type { ExecutiveDecisionResult } from "@/lib/dashboard/executive-decision-types";
import type { ExecutiveFinancialCockpitData } from "@/lib/dashboard/executive-financial-cockpit-types";
import type { ExecutiveIntelligenceData } from "@/lib/dashboard/executive-intelligence-types";
import { buildCockpitAlerts } from "@/lib/dashboard/cockpit-v2/alerts";
import { getCockpitEmptyStates } from "@/lib/dashboard/cockpit-v2/empty-states";
import { buildCockpitKpis } from "@/lib/dashboard/cockpit-v2/kpis";
import {
  buildCashExecutiveCard,
  buildDreExecutiveCard,
  buildExecutiveBriefV2,
  buildMetaPanel,
} from "@/lib/dashboard/cockpit-v2/panels";
import {
  buildPremiumInsights,
  buildPremiumOpsCards,
} from "@/lib/dashboard/premium-dashboard-map";
import { gfSpace } from "@/lib/design-system/signature";
import { cn } from "@/lib/utils";

type Props = {
  tenantSlug: string;
  tenantName: string;
  greeting: string;
  segment: string | null;
  segmentVersion?: number | null;
  segmentConfig?: unknown;
  hoje: DashboardHojeSnapshot;
  primary: DashboardPrimaryData | null;
  charts: DashboardCharts | null;
  cockpit: ExecutiveFinancialCockpitData;
  intelligence: ExecutiveIntelligenceData;
  decision: ExecutiveDecisionResult;
  estoqueAbaixoMinimo: number | null;
  periodoLabel: string;
  aiSlot: ReactNode;
  /** Sprint 30.4.1 — gráficos em Suspense (fora do first paint) */
  mainRowSlot?: ReactNode;
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
 * Executive Cockpit V2 — Sprint 30.4 (apresentação).
 * Hierarquia: saudação → KPIs → Brief → Metas/DRE/Caixa → Alertas → Quick Actions.
 * Sem alteração de cálculos financeiros.
 */
export function PremiumDashboardView({
  tenantSlug,
  tenantName,
  greeting,
  segment,
  segmentVersion,
  segmentConfig,
  hoje,
  primary,
  charts,
  cockpit,
  intelligence,
  decision,
  estoqueAbaixoMinimo,
  periodoLabel,
  aiSlot,
  mainRowSlot,
}: Props) {
  const insights = buildPremiumInsights({
    cockpit,
    intelligence,
    decision,
    estoqueAbaixoMinimo,
    primary,
    charts,
    tenantSlug,
    segment,
    segmentVersion,
    segmentConfig,
  });
  const ops = buildPremiumOpsCards({
    hoje,
    primary,
    intelligence,
    estoqueAbaixoMinimo,
    tenantSlug,
    segment,
    segmentVersion,
    segmentConfig,
  });
  const kpis = buildCockpitKpis({
    primary,
    hoje,
    intelligence,
    cockpit,
    tenantSlug,
    segment,
    segmentVersion,
    segmentConfig,
  });
  const alerts = buildCockpitAlerts({ insights, decision, tenantSlug });
  const brief = buildExecutiveBriefV2({
    hoje,
    alerts,
    insights,
    tenantSlug,
  });
  const meta = buildMetaPanel({ hoje, tenantSlug });
  const dre = buildDreExecutiveCard({ primary, charts, tenantSlug });
  const cash = buildCashExecutiveCard({ cockpit, tenantSlug });
  const ui = getSegmentUiCopy({
    segment,
    segmentVersion,
    segmentConfig,
  });
  const quickActions = filterDashboardSurface(
    getSegmentQuickActions(segment).map((action) =>
      action.id === "os"
        ? {
            ...action,
            label: ui.newWorkOrder,
            description: `Abrir ${ui.workOrder.toLowerCase()}`,
          }
        : action,
    ),
    { segment, segmentVersion, segmentConfig },
  );
  const emptyStates = getCockpitEmptyStates(segment).map((item) =>
    item.domain === "vendas" && ui.engine
      ? {
          ...item,
          title: ui.emptySalesTitle,
          body: ui.emptySalesBody,
        }
      : item.domain === "servicos" && ui.engine
        ? {
            ...item,
            body: `Cadastre ${ui.catalog.toLowerCase()} para operar com agenda.`,
          }
        : item,
  );

  const activeEmpty: Array<(typeof emptyStates)[number]["domain"]> = [];
  if (hoje.mes.quantidade_vendas === 0 && hoje.hoje.quantidade_vendas === 0) {
    activeEmpty.push("vendas");
  }
  if (primary?.kpis.quantidade_clientes === 0) activeEmpty.push("clientes");
  if (hoje.mes.meta == null) activeEmpty.push("metas");
  if (!primary) activeEmpty.push("dre");

  const alertCount = alerts.filter(
    (a) => a.priority === "critica" || a.priority === "alta",
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
      data-dashboard-premium-v304=""
      data-dashboard-block="premium-v304"
      data-dashboard-layout="cockpit-v2"
      data-cockpit-hierarchy="header-kpi-brief-finance-alerts-actions"
      data-premium-motion="dashboard-entrance"
      data-brand-continuity="dashboard"
      data-signature="30.4"
      data-dashboard-premium-v3041=""
      data-sprint-polish="30.4.1"
      data-cockpit-segment={segment ?? "outro"}
    >
      <div
        className="pointer-events-none absolute -top-12 left-1/2 h-64 w-[min(100%,60rem)] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgb(201_168_76_/0.14),transparent_72%)]"
        aria-hidden
      />

      <div className={cn("relative", gfSpace.stackSection)}>
        {/* Bloco 1 — Saudação inteligente */}
        <div
          className="premium-enter premium-enter-delay-1 space-y-2"
          data-cockpit-block="greeting"
        >
          <p
            className="text-sm text-[var(--text-secondary)] text-pretty"
            data-cockpit-greeting=""
          >
            {greeting.includes(".") ? greeting : `${greeting}.`}
          </p>
          <GFExecutiveHeader
            greeting={greeting}
            tenantName={tenantName}
            dataHoje={hoje.data_hoje}
            updatedAtLabel={hoje.atualizado_em_label}
            status={hoje.hoje.status}
            metaMensal={hoje.mes.meta}
            companyStatusLabel={cockpit.saudeLabel}
            companyStatusTone={companyTone(cockpit.saude)}
            tenantSlug={tenantSlug}
          />
          <p className="text-xs text-[var(--text-muted)]">
            Período · {periodoLabel}
          </p>
        </div>

        {/* Bloco 2 — KPIs */}
        <div className="premium-enter premium-enter-delay-2">
          <CockpitKpiGrid items={kpis} periodoLabel={periodoLabel} />
        </div>

        {/* Bloco 3 — Executive Brief */}
        <div className="premium-enter premium-enter-delay-3">
          <ExecutiveBriefV2 brief={brief} />
        </div>

        {/* Blocos 4–6 — Metas · DRE · Caixa */}
        <div className="premium-enter premium-enter-delay-3 space-y-[var(--gf-space-block)]">
          <MetaPanel meta={meta} />
          <DreCashCards dre={dre} cash={cash} />
        </div>

        {/* Gráfico / inteligência — streamado (30.4.1) ou inline */}
        <div
          className="premium-enter premium-enter-delay-4"
          data-cockpit-block="charts"
        >
          {mainRowSlot ?? (
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
          )}
        </div>

        <div className="premium-enter premium-enter-delay-4">
          <PremiumOpsStrip items={ops} />
        </div>

        {/* Bloco 7 — Alertas */}
        <div className="premium-enter premium-enter-delay-5">
          <AlertsCenter alerts={alerts} />
        </div>

        {/* Bloco 8 — Quick Actions */}
        <div className="premium-enter premium-enter-delay-5">
          <QuickActionsPanel
            tenantSlug={tenantSlug}
            actions={quickActions}
          />
        </div>

        <EmptyStatesRail
          tenantSlug={tenantSlug}
          items={emptyStates}
          activeDomains={activeEmpty}
        />

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
                defaultOpen: false,
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
                summary: "Leitura de 5 segundos · evidências sob demanda.",
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
            ]}
          />
        </div>

        <BrandInstitutionalFooter compact />
      </div>
    </div>
  );
}
