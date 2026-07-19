import { formatCurrency } from "@/lib/dashboard/format";
import type { ExecutiveIntelligenceInput } from "@/lib/intelligence/types";
import type { ExecutiveActionResult } from "@/lib/intelligence/types";
import type {
  BusinessOpportunity,
  BusinessPriority,
  BusinessRisk,
} from "@/lib/business-intelligence/types";

const MAX_PRIORITIES = 5;

function sevToPriority(
  severity: BusinessRisk["severity"],
): BusinessPriority["priority"] {
  if (severity === "alta") return "alta";
  if (severity === "media") return "media";
  return "baixa";
}

/**
 * Ranking de prioridades — deduplicado a partir de riscos, ação e oportunidades.
 */
export function buildBusinessPriorities(input: {
  action: ExecutiveActionResult;
  risks: BusinessRisk[];
  opportunities: BusinessOpportunity[];
  intelligenceInput: ExecutiveIntelligenceInput;
}): BusinessPriority[] {
  const seen = new Set<string>();
  const out: BusinessPriority[] = [];

  const push = (p: BusinessPriority) => {
    const key = p.title.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(p);
  };

  // 1) Ação principal
  push({
    id: "prio-acao",
    priority:
      input.action.severity === "critical"
        ? "alta"
        : input.action.severity === "important"
          ? "media"
          : input.action.severity === "positive"
            ? "baixa"
            : "media",
    title: input.action.title,
    description: input.action.description,
    estimatedImpact: input.action.rationale,
  });

  // 2) Riscos altos/médios
  for (const risk of input.risks) {
    if (risk.severity === "baixa") continue;
    push({
      id: `prio-${risk.id}`,
      priority: sevToPriority(risk.severity),
      title: risk.title,
      description: risk.description,
      estimatedImpact: risk.impact,
    });
  }

  // 3) Oportunidades de alto valor (média diária / centro)
  for (const opp of input.opportunities) {
    if (
      opp.id === "opp-media-diaria" ||
      opp.id === "opp-centro" ||
      opp.id === "opp-cadastrar-meta"
    ) {
      push({
        id: `prio-${opp.id}`,
        priority: opp.id === "opp-media-diaria" ? "alta" : "media",
        title: opp.title,
        description: opp.description,
        estimatedImpact: opp.estimatedImpact,
      });
    }
  }

  // 4) Fallback de acompanhamento
  if (out.length < 2 && input.intelligenceInput.diasUteisRestantes > 0) {
    push({
      id: "prio-acompanhar",
      priority: "baixa",
      title: "Acompanhar o ritmo diário até o fechamento",
      description: `Restam ${input.intelligenceInput.diasUteisRestantes} dia(s) útil(is) com realizado em ${formatCurrency(input.intelligenceInput.realizado)}.`,
      estimatedImpact: "Mantém visibilidade sem inventar novas alavancas.",
    });
  }

  const order = { alta: 0, media: 1, baixa: 2 } as const;
  return out
    .sort((a, b) => order[a.priority] - order[b.priority])
    .slice(0, MAX_PRIORITIES);
}
