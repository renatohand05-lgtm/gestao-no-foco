/**
 * Executive Timeline Engine — tipos (Sprint 11.5)
 */

export type TimelineCategory =
  | "Meta"
  | "Ritmo"
  | "Projeção"
  | "Ticket"
  | "Crescimento"
  | "Confiança"
  | "Tendência"
  | "Performance";

export type TimelineTone = "Success" | "Warning" | "Danger" | "Info";

export type TimelinePriority = "CRITICA" | "ALTA" | "MEDIA" | "BAIXA";

export type TimelineConfidence = "baixa" | "media" | "alta";

export type TimelineOrigin =
  | "executive_intelligence"
  | "business_intelligence"
  | "prediction_engine";

export type TimelineEvent = {
  id: string;
  priority: TimelinePriority;
  category: TimelineCategory;
  tone: TimelineTone;
  title: string;
  description: string;
  impact: string;
  confidence: TimelineConfidence;
  origin: TimelineOrigin;
  /** Presente só quando a origem já carrega marco temporal. */
  timestamp: string | null;
  /** Score interno para ordenação de impacto (0–100) — não é KPI. */
  impactScore: number;
  /** Ordem de recência sintética (menor = mais recente no relato). */
  recencyRank: number;
};

export type TimelineEngineResult = {
  events: TimelineEvent[];
  visible: TimelineEvent[];
  hiddenCount: number;
  hasHistory: boolean;
};

export const TIMELINE_MAX_VISIBLE = 8;
