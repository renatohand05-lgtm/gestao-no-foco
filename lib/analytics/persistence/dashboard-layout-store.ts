/**
 * Fase 23 — Preferências / layout (reuso conceitual — sem nova tabela).
 * Persistência real: dashboard_usuario_preferencias / dashboard_layouts existentes.
 */

import type { DashboardLayoutConfig, DashboardWidgetDefinition } from "../core/metric-types.ts";

export const DEFAULT_EXECUTIVE_WIDGETS: readonly DashboardWidgetDefinition[] = [
  {
    id: "kpi-finance",
    title: "Financeiro",
    metricIds: [
      "fin.receita_liquida",
      "fin.ebitda",
      "fin.margem_ebitda",
      "fin.saldo_consolidado",
      "fin.capital_giro",
    ],
    area: "financeiro",
    defaultVisible: true,
  },
  {
    id: "kpi-sales",
    title: "Comercial",
    metricIds: [
      "vendas.faturamento",
      "vendas.ticket_medio",
      "vendas.quantidade",
      "vendas.conversao",
    ],
    area: "vendas",
    defaultVisible: true,
  },
  {
    id: "kpi-ops",
    title: "Operação",
    metricIds: ["os.abertas", "os.concluidas", "os.tempo_medio", "clientes.ativos"],
    area: "operacoes",
    defaultVisible: true,
  },
  {
    id: "kpi-stock-tax",
    title: "Estoque & Tributos",
    metricIds: ["estoque.valor", "estoque.ruptura", "tax.carga", "tax.eficiencia"],
    area: "executivo",
    defaultVisible: true,
  },
] as const;

export function createDefaultAnalyticsLayout(): DashboardLayoutConfig {
  return {
    version: 1,
    presetKey: "executive_default",
    widgets: DEFAULT_EXECUTIVE_WIDGETS.map((w, order) => ({
      id: w.id,
      order,
      visible: w.defaultVisible,
    })),
  };
}

export function mergeAnalyticsLayout(
  saved: DashboardLayoutConfig | null | undefined,
): DashboardLayoutConfig {
  if (!saved || saved.version !== 1) return createDefaultAnalyticsLayout();
  const defaults = createDefaultAnalyticsLayout();
  const byId = new Map(saved.widgets.map((w) => [w.id, w]));
  return {
    version: 1,
    presetKey: "executive_default",
    widgets: defaults.widgets.map((w) => byId.get(w.id) ?? w),
  };
}
