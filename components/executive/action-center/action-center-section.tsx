import { ExecutiveActionCard } from "@/components/executive/action-center/executive-action-card";
import { buildActionCenterDecision } from "@/lib/action-center";
import type { ActionCenterDecision } from "@/lib/action-center";
import type { ExecutiveIntelligenceResult } from "@/lib/intelligence/types";

type Props = {
  intelligence: ExecutiveIntelligenceResult;
  /** Decisão já composta no stream — evita rebuild (Sprint 13.9). */
  decision?: ActionCenterDecision;
};

/**
 * Action Center — bloco de decisão no Dashboard.
 * Apresentação: reutiliza actionLabel do motor de inteligência quando existir.
 */
export function ActionCenterSection({ intelligence, decision }: Props) {
  const base = decision ?? buildActionCenterDecision(intelligence);
  const presentable: ActionCenterDecision = {
    ...base,
    cta: {
      ...base.cta,
      label: intelligence.action.actionLabel?.trim() || base.cta.label,
    },
  };
  return <ExecutiveActionCard decision={presentable} />;
}
