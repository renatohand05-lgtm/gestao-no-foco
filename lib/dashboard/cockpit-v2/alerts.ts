/**
 * Sprint 30.4 — Central de alertas (apresentação).
 * Só promove insights/decisões já existentes — nunca inventa alerta.
 */

import type { PremiumInsightCard } from "@/lib/dashboard/premium-dashboard-map";
import type { ExecutiveDecisionResult } from "@/lib/dashboard/executive-decision-types";
import type {
  AlertCategory,
  AlertPriority,
} from "@/config/dashboard/cockpit-v2";

export type CockpitAlert = {
  id: string;
  title: string;
  description: string;
  impact: string;
  suggestedAction: string;
  href: string;
  priority: AlertPriority;
  category: AlertCategory;
  /** Fonte real — nunca "IA inventada" */
  source: string;
};

function priorityFromSeverity(
  severity: PremiumInsightCard["severity"],
): AlertPriority {
  if (severity === "danger") return "critica";
  if (severity === "warning") return "alta";
  if (severity === "success") return "baixa";
  return "media";
}

function categoryFromInsight(card: PremiumInsightCard): AlertCategory {
  const hay = `${card.id} ${card.title} ${card.origem}`.toLowerCase();
  if (/estoq|sku/.test(hay)) return "estoque";
  if (/tribut|obrig|fiscal|imposto/.test(hay)) return "tributario";
  if (/compra|fornecedor|pedido de compra/.test(hay)) return "compras";
  if (/crm|lead|pipeline|oportunidade comercial/.test(hay)) return "crm";
  if (/equipe|membro|mecan/.test(hay)) return "equipe";
  if (/oper|os |ordem|atrasad|cliente/.test(hay)) return "operacao";
  return "financeiro";
}

function actionFromCard(card: PremiumInsightCard): string {
  if (card.href?.includes("fluxo-caixa")) return "Revisar fluxo de caixa";
  if (card.href?.includes("estoque")) return "Abrir reposição de estoque";
  if (card.href?.includes("ordens") || card.href?.includes("centro-operacoes")) {
    return "Abrir centro de operações";
  }
  if (card.href?.includes("dre")) return "Abrir DRE";
  if (card.href?.includes("metas")) return "Ajustar meta";
  return "Ver detalhe";
}

/**
 * Monta alertas apenas a partir de insights com evidência (severity warning/danger
 * ou decision critical/warning). Itens "Indisponível" informativos não viram alerta.
 */
export function buildCockpitAlerts(input: {
  insights: PremiumInsightCard[];
  decision: ExecutiveDecisionResult;
  tenantSlug: string;
}): CockpitAlert[] {
  const { insights, decision, tenantSlug } = input;
  const alerts: CockpitAlert[] = [];
  const seen = new Set<string>();

  for (const card of insights) {
    const isUnavailableBody = /indisponível/i.test(card.body);
    const isActionable =
      card.severity === "danger" ||
      card.severity === "warning" ||
      (card.severity === "success" && /oportunidade/i.test(card.title));
    if (!isActionable) continue;
    if (isUnavailableBody && card.severity !== "danger") continue;
    if (seen.has(card.id)) continue;
    seen.add(card.id);

    alerts.push({
      id: card.id,
      title: card.title,
      description: card.body,
      impact:
        card.severity === "danger"
          ? "Impacto alto no ciclo"
          : card.severity === "warning"
            ? "Requer atenção"
            : "Oportunidade identificada",
      suggestedAction: actionFromCard(card),
      href: card.href ?? `/${tenantSlug}/dashboard`,
      priority: priorityFromSeverity(card.severity),
      category: categoryFromInsight(card),
      source: card.origem,
    });
  }

  for (const item of decision.items) {
    if (item.severity !== "critical" && item.severity !== "warning") continue;
    const id = `decision-${item.id}`;
    if (seen.has(id)) continue;
    seen.add(id);
    alerts.push({
      id,
      title: item.title,
      description: item.description,
      impact:
        item.severity === "critical"
          ? "Prioridade crítica do centro de decisão"
          : "Atenção do centro de decisão",
      suggestedAction: item.href ? "Abrir origem" : "Revisar no cockpit",
      href: item.href ?? `/${tenantSlug}/dashboard`,
      priority: item.severity === "critical" ? "critica" : "alta",
      category: "operacao",
      source: item.source || "Centro de Decisão",
    });
  }

  const rank: Record<AlertPriority, number> = {
    critica: 0,
    alta: 1,
    media: 2,
    baixa: 3,
  };
  return alerts.sort((a, b) => rank[a.priority] - rank[b.priority]);
}
