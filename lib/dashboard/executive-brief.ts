/**
 * Sprint 26.1 — Executive Brief compacto a partir de dados reais do ciclo.
 * Não inventa métricas; só sintetiza o que já existe no snapshot.
 */

import type { DashboardHojeSnapshot } from "@/lib/dashboard/vendas-dia-service";
import type { ExecutiveFinancialCockpitData } from "@/lib/dashboard/executive-financial-cockpit-types";
import type { PremiumInsightCard, PremiumKpiItem } from "@/lib/dashboard/premium-dashboard-map";
import { formatCurrencyCompact, formatPercent } from "@/lib/dashboard/format";

export type ExecutiveBriefTone = "success" | "warning" | "danger" | "info" | "neutral";

export type ExecutiveBriefModel = {
  headline: string;
  narrative: string;
  focusLabel: string;
  focusHref: string;
  chips: Array<{
    id: string;
    label: string;
    value: string;
    tone: ExecutiveBriefTone;
  }>;
  alertCount: number;
};

function toneFromSaude(
  saude: ExecutiveFinancialCockpitData["saude"],
): ExecutiveBriefTone {
  if (saude === "saudavel") return "success";
  if (saude === "atencao") return "warning";
  if (saude === "critico") return "danger";
  return "neutral";
}

export function buildExecutiveBrief(input: {
  greeting: string;
  tenantName: string;
  hoje: DashboardHojeSnapshot;
  cockpit: ExecutiveFinancialCockpitData;
  kpis: PremiumKpiItem[];
  insights: PremiumInsightCard[];
  tenantSlug: string;
}): ExecutiveBriefModel {
  const { greeting, tenantName, hoje, cockpit, kpis, insights, tenantSlug } =
    input;

  const alertInsights = insights.filter(
    (i) => i.severity === "danger" || i.severity === "warning",
  );
  const topAlert = alertInsights[0] ?? insights[0] ?? null;

  const metaPct = hoje.mes.percentual;
  const faturamento = kpis.find((k) => k.id === "faturamento");
  const caixa = kpis.find((k) => k.id === "caixa");

  const narrativeParts: string[] = [];
  narrativeParts.push(
    `${tenantName} · ciclo de ${hoje.data_hoje}. Caixa ${cockpit.saudeLabel.toLowerCase()}.`,
  );
  if (metaPct != null) {
    narrativeParts.push(
      `Meta do mês em ${formatPercent(metaPct)}${
        hoje.mes.faturamento != null
          ? ` com ${formatCurrencyCompact(hoje.mes.faturamento)} realizados`
          : ""
      }.`,
    );
  }
  if (topAlert) {
    narrativeParts.push(`Foco: ${topAlert.title}.`);
  }

  const chips: ExecutiveBriefModel["chips"] = [
    {
      id: "saude",
      label: "Saúde de caixa",
      value: cockpit.saudeLabel,
      tone: toneFromSaude(cockpit.saude),
    },
  ];

  if (faturamento) {
    chips.push({
      id: "fat",
      label: "Faturamento",
      value: faturamento.value,
      tone: faturamento.unavailable ? "neutral" : "info",
    });
  }
  if (caixa) {
    chips.push({
      id: "caixa",
      label: "Caixa",
      value: caixa.value,
      tone: caixa.unavailable
        ? "neutral"
        : caixa.tone === "danger"
          ? "danger"
          : "success",
    });
  }
  if (metaPct != null) {
    chips.push({
      id: "meta",
      label: "Meta mês",
      value: formatPercent(metaPct),
      tone: metaPct >= 100 ? "success" : metaPct >= 70 ? "info" : "warning",
    });
  }

  return {
    headline: greeting.includes(".") ? greeting : `${greeting}.`,
    narrative: narrativeParts.join(" "),
    focusLabel: topAlert?.title ?? "Abrir fluxo de caixa",
    focusHref:
      topAlert?.href ?? `/${tenantSlug}/financeiro/fluxo-caixa`,
    chips: chips.slice(0, 4),
    alertCount: alertInsights.length,
  };
}
