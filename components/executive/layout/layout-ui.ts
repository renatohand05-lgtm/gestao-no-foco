/**
 * Constantes de UI do Workspace Editor — Sprint 13.5.
 * Apenas apresentação; motor de layout intacto.
 */

import type { LayoutBlockId, LayoutDensity } from "@/lib/dashboard-layout";

export const LAYOUT_BLOCK_DESCRIPTIONS: Record<LayoutBlockId, string> = {
  hero: "Cockpit executivo e saúde da empresa",
  kpis: "Indicadores-chave do período",
  action_center: "Próxima decisão recomendada",
  performance: "Leitura de performance comercial",
  business: "Riscos e oportunidades de negócio",
  timeline: "Linha do tempo executiva",
  prediction: "Projeção e confiança",
  monthly: "Evolução mensal",
  daily: "Operação diária",
  heatmap: "Mapa de calor da operação",
  rankings: "Rankings e destaques",
  intelligence: "Insights de inteligência",
  copilot: "Assistente executivo",
  action_plan: "Plano de ação priorizado",
};

export const DENSITY_PRIORITY_LABEL: Record<LayoutDensity, string> = {
  expandido: "Prioridade alta",
  normal: "Prioridade média",
  compact: "Prioridade baixa",
  recolhido: "Recolhido",
};

export type StudioView = "published" | "edit" | "preview";
