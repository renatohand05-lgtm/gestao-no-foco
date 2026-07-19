/**
 * Layout presets — reordem dos blocos existentes (Sprint 12.2 / 12.3).
 * Sem alterar o motor; apenas ordem/visibilidade.
 */

import type { LayoutBlockId, LayoutPresetId } from "@/lib/dashboard-layout/layout-types";
import { ALL_LAYOUT_BLOCKS } from "@/lib/dashboard-layout/layout-types";

export type LayoutPresetDefinition = {
  id: LayoutPresetId;
  label: string;
  description: string;
  /** Ordem preferida; ids omitidos ficam no fim. */
  order: LayoutBlockId[];
  /** Blocos ocultos neste preset. */
  hidden?: LayoutBlockId[];
};

const REST = (preferred: LayoutBlockId[]): LayoutBlockId[] => {
  const set = new Set(preferred);
  return [...preferred, ...ALL_LAYOUT_BLOCKS.filter((id) => !set.has(id))];
};

/** Hierarquia narrativa Sprint 13.4 — ritmo CEO */
const EXECUTIVE_CORE: LayoutBlockId[] = [
  "hero",
  "kpis",
  "action_center",
  "performance",
  "business",
  "timeline",
  "heatmap",
  "rankings",
  "prediction",
  "monthly",
  "daily",
];

const DEFERRED: LayoutBlockId[] = [
  "intelligence",
  "copilot",
  "action_plan",
];

export const LAYOUT_PRESETS: LayoutPresetDefinition[] = [
  {
    id: "ceo",
    label: "CEO",
    description: "Saúde da empresa em 5 segundos.",
    order: REST(EXECUTIVE_CORE),
    hidden: DEFERRED,
  },
  {
    id: "financeiro",
    label: "Financeiro",
    description: "Receita, meta, gap e previsão.",
    order: REST([
      "hero",
      "kpis",
      "performance",
      "prediction",
      "monthly",
      "action_center",
      "business",
      "timeline",
    ]),
    hidden: ["heatmap", "rankings", "daily", ...DEFERRED],
  },
  {
    id: "comercial",
    label: "Comercial",
    description: "KPIs, ação e rankings.",
    order: REST([
      "hero",
      "kpis",
      "action_center",
      "rankings",
      "prediction",
      "performance",
      "business",
    ]),
    hidden: ["heatmap", "intelligence", "copilot"],
  },
  {
    id: "operacional",
    label: "Operacional",
    description: "Dia a dia, heatmap e performance.",
    order: REST([
      "hero",
      "kpis",
      "action_center",
      "daily",
      "heatmap",
      "performance",
      "timeline",
      "monthly",
    ]),
    hidden: ["copilot", "intelligence"],
  },
  {
    id: "rh",
    label: "RH",
    description: "Performance e indicadores-chave.",
    order: REST([
      "hero",
      "kpis",
      "performance",
      "action_center",
      "business",
      "timeline",
    ]),
    hidden: ["heatmap", "rankings", "daily", "copilot"],
  },
  {
    id: "oficina",
    label: "Oficina",
    description: "Execução diária e gargalos.",
    order: REST([
      "hero",
      "kpis",
      "action_center",
      "daily",
      "heatmap",
      "performance",
      "prediction",
      "rankings",
    ]),
    hidden: ["intelligence", "copilot"],
  },
  {
    id: "restaurante",
    label: "Restaurante",
    description: "Ticket, operação e rankings.",
    order: REST([
      "hero",
      "kpis",
      "action_center",
      "daily",
      "rankings",
      "performance",
      "prediction",
    ]),
    hidden: ["heatmap", "intelligence", "copilot"],
  },
  {
    id: "consultoria",
    label: "Consultoria",
    description: "BI, previsão e timeline.",
    order: REST([
      "hero",
      "kpis",
      "action_center",
      "business",
      "prediction",
      "timeline",
      "performance",
    ]),
    hidden: ["heatmap", "daily"],
  },
];

export function getLayoutPreset(
  id: LayoutPresetId,
): LayoutPresetDefinition | undefined {
  return LAYOUT_PRESETS.find((p) => p.id === id);
}
