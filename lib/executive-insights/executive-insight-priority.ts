/**
 * Prioridade / severidade — determinística a partir de tipos existentes.
 */

import type {
  ExecutiveInsightSeverity,
  ExecutiveInsightType,
} from "@/lib/executive-insights/executive-insight-types";
import type { ActionCenterPriority } from "@/lib/action-center/types";
import type { BusinessRiskSeverity } from "@/lib/business-intelligence/types";
import type { ExecutiveInsightCategory as EiCategory } from "@/lib/intelligence/types";

export function severityFromType(type: ExecutiveInsightType): ExecutiveInsightSeverity {
  switch (type) {
    case "critical":
      return "critical";
    case "warning":
      return "high";
    case "opportunity":
      return "medium";
    case "positive":
      return "low";
    default:
      return "low";
  }
}

export function typeFromEiCategory(category: EiCategory): ExecutiveInsightType {
  switch (category) {
    case "critical":
      return "critical";
    case "important":
      return "warning";
    case "positive":
      return "positive";
    default:
      return "informational";
  }
}

export function typeFromBusinessSeverity(
  severity: BusinessRiskSeverity,
): ExecutiveInsightType {
  switch (severity) {
    case "alta":
      return "critical";
    case "media":
      return "warning";
    default:
      return "informational";
  }
}

export function typeFromActionPriority(
  priority: ActionCenterPriority,
): ExecutiveInsightType {
  switch (priority) {
    case "CRITICA":
      return "critical";
    case "ALTA":
      return "warning";
    case "MEDIA":
      return "opportunity";
    default:
      return "informational";
  }
}

/** Score de prioridade (maior = mais urgente). */
export function priorityScore(input: {
  type: ExecutiveInsightType;
  severity: ExecutiveInsightSeverity;
  confidence: "baixa" | "media" | "alta";
  actionable: boolean;
}): number {
  const typeW =
    input.type === "critical"
      ? 1000
      : input.type === "warning"
        ? 700
        : input.type === "opportunity"
          ? 400
          : input.type === "positive"
            ? 200
            : 50;

  const sevW =
    input.severity === "critical"
      ? 80
      : input.severity === "high"
        ? 50
        : input.severity === "medium"
          ? 20
          : 5;

  const confW =
    input.confidence === "alta" ? 30 : input.confidence === "media" ? 15 : 0;

  return typeW + sevW + confW + (input.actionable ? 25 : 0);
}
