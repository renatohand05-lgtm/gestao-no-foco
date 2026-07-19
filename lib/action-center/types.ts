/**
 * Action Center — tipos (Sprint 11.4)
 */

export type ActionCenterPriority = "CRITICA" | "ALTA" | "MEDIA" | "BAIXA";

export type ActionCenterConfidence = "baixa" | "media" | "alta";

export type ActionCenterDecision = {
  priority: ActionCenterPriority;
  headline: string;
  description: string;
  impact: string;
  deadline: string;
  cta: {
    label: string;
    href: string;
  };
  reason: string;
  confidence: ActionCenterConfidence;
};
