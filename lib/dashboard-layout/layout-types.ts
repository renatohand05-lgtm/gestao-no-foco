/**
 * Personal Dashboard Layout — tipos (Sprint 12.2)
 * Layout / UX apenas. Sem I/O de negócio.
 */

import type { WorkspaceBlockId, WorkspaceCardDensity } from "@/lib/workspace";

export type LayoutBlockId = WorkspaceBlockId;

export type LayoutDensity = WorkspaceCardDensity;

export type LayoutBlockState = {
  id: LayoutBlockId;
  visible: boolean;
  density: LayoutDensity;
  /** Ordem visual (0 = topo). */
  order: number;
};

export type LayoutPresetId =
  | "ceo"
  | "financeiro"
  | "comercial"
  | "operacional"
  | "rh"
  | "oficina"
  | "restaurante"
  | "consultoria"
  | "custom";

export type DashboardLayoutSnapshot = {
  version: 1;
  name: string;
  presetId: LayoutPresetId;
  updatedAt: string;
  compactMode: boolean;
  blocks: LayoutBlockState[];
};

export type LayoutEngineState = {
  editMode: boolean;
  fullscreen: boolean;
  compactMode: boolean;
  activePresetId: LayoutPresetId;
  layoutName: string;
  blocks: LayoutBlockState[];
  /** Cópias salvas em memória (duplicar / salvar). */
  savedLayouts: DashboardLayoutSnapshot[];
};

export const LAYOUT_SCHEMA_VERSION = 1 as const;

/** Ordem narrativa (Sprint 13.2) — catálogo; motor intacto. */
export const ALL_LAYOUT_BLOCKS: LayoutBlockId[] = [
  "hero",
  "kpis",
  "action_center",
  "performance",
  "business",
  "timeline",
  "prediction",
  "monthly",
  "daily",
  "heatmap",
  "rankings",
  "intelligence",
  "copilot",
  "action_plan",
];

export const LAYOUT_BLOCK_LABELS: Record<LayoutBlockId, string> = {
  hero: "Hero",
  action_center: "Action Center",
  intelligence: "Inteligência",
  business: "Negócio",
  prediction: "Previsão",
  timeline: "Timeline",
  copilot: "Copilot",
  action_plan: "Plano",
  kpis: "KPIs",
  performance: "Performance",
  monthly: "Evolução",
  daily: "Operação",
  heatmap: "Heatmap",
  rankings: "Rankings",
};
