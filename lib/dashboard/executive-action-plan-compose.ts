/**
 * Composição pura do Plano de Ação do Dia (Gate 17.1 / 17.2 hardening).
 * Ações concretas — redação distinta do Centro de Decisão (sinais).
 */

import type { ExecutiveDecisionItem } from "@/lib/dashboard/executive-decision-types";
import type { ExecutiveIntelligenceData } from "@/lib/dashboard/executive-intelligence-types";
import type { ExecutiveFinancialCockpitData } from "@/lib/dashboard/executive-financial-cockpit-types";
import type {
  ActionPlanPriority,
  ActionPlanRecommendation,
  ExecutiveActionPlanData,
} from "@/lib/dashboard/executive-action-plan-types";

const MAX_ITEMS = 5;

function money(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/** Sinais informativos / oportunidades — ficam no Centro de Decisão. */
const SKIP_DECISION_IDS = new Set([
  "meta-dia-atingida",
  "capacidade-limite",
  "orcamentos-recuperacao",
]);

/** Título acionável (não repetir o título do sinal). */
const ACTION_TITLE: Record<string, string> = {
  "meta-dia-abaixo": "Acelerar vendas do dia",
  "projecao-mes-abaixo": "Recuperar ritmo mensal de vendas",
  "os-aguardando-aprovacao": "Cobrar aprovações pendentes",
  "os-paradas": "Destravar OS paradas na oficina",
  "estoque-critico": "Repor itens com estoque crítico",
  "contas-pagar-atencao": "Regularizar contas a pagar",
  "contas-receber-atraso": "Cobrar recebimentos em atraso",
};

function priorityFromSeverity(
  severity: ExecutiveDecisionItem["severity"],
): ActionPlanPriority | null {
  // Plano: critical → Crítico (alta); warning → Atenção (média). Oportunidades → Decisão.
  if (severity === "critical") return "alta";
  if (severity === "warning") return "media";
  return null;
}

function fromDecision(
  item: ExecutiveDecisionItem,
): ActionPlanRecommendation | null {
  if (SKIP_DECISION_IDS.has(item.id)) return null;
  if (!item.href || !item.actionLabel) return null;
  const priority = priorityFromSeverity(item.severity);
  if (!priority) return null;

  const title = ACTION_TITLE[item.id] ?? `Agir: ${item.title}`;

  return {
    id: `decision:${item.id}`,
    priority,
    title,
    description: item.description,
    impactValue: item.impactValue ?? null,
    actionLabel: item.actionLabel,
    href: item.href,
    source: item.source,
    score:
      item.score +
      (priority === "alta" ? 10 : priority === "media" ? 4 : 0) +
      (item.impactValue && item.impactValue > 0 ? 5 : 0),
  };
}

function sortRecs(items: ActionPlanRecommendation[]) {
  return items.slice().sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.priority !== b.priority) {
      return a.priority === "alta" ? -1 : 1;
    }
    const impactA = a.impactValue ?? 0;
    const impactB = b.impactValue ?? 0;
    if (impactB !== impactA) return impactB - impactA;
    return a.id.localeCompare(b.id);
  });
}

/**
 * Monta recomendações a partir de dados já existentes.
 * Não inventa métricas — só traduz o que já está disponível.
 */
export function composeExecutiveActionPlan(input: {
  tenantSlug: string;
  decisionItems: ExecutiveDecisionItem[];
  intelligence: ExecutiveIntelligenceData;
  cockpit?: ExecutiveFinancialCockpitData | null;
}): ExecutiveActionPlanData {
  const slug = input.tenantSlug;
  const byKey = new Map<string, ActionPlanRecommendation>();

  for (const item of input.decisionItems) {
    const rec = fromDecision(item);
    if (!rec) continue;
    byKey.set(rec.id, rec);
  }

  const saude = input.intelligence.saudeOperacao;
  const osAguardandoCliente =
    saude.status === "available"
      ? (saude.osAguardandoCliente ?? saude.clientesAguardandoRetorno ?? 0)
      : 0;

  if (saude.status === "available" && osAguardandoCliente > 0) {
    const qtd = osAguardandoCliente;
    byKey.set("intel:os-aguardando-cliente", {
      id: "intel:os-aguardando-cliente",
      priority: qtd >= 3 ? "alta" : "media",
      title: "Retomar OS aguardando cliente",
      description: `${qtd} atendimento${qtd > 1 ? "s" : ""} com status aguardando cliente.`,
      impactValue: null,
      actionLabel: "Abrir OS",
      href: `/${slug}/ordens?status=aguardando_cliente`,
      source: "saude-operacao",
      score: qtd >= 3 ? 85 : 55,
    });
  }

  if (
    saude.status === "available" &&
    (saude.osAtrasadas ?? 0) > 0 &&
    !byKey.has("decision:os-paradas")
  ) {
    const qtd = saude.osAtrasadas ?? 0;
    byKey.set("intel:os-atrasadas", {
      id: "intel:os-atrasadas",
      priority: "alta",
      title: "Priorizar entrega de OS atrasadas",
      description: `${qtd} ordem${qtd > 1 ? "ns" : ""} com previsão de entrega vencida.`,
      impactValue: null,
      actionLabel: "Ver oficina",
      href: `/${slug}/centro-operacoes`,
      source: "saude-operacao",
      score: 95,
    });
  }

  const receita = input.intelligence.receitaPotencial;
  if (
    (receita.status === "available" || receita.status === "partial") &&
    (receita.aguardandoAprovacaoQtd ?? 0) > 0 &&
    !byKey.has("decision:os-aguardando-aprovacao")
  ) {
    const qtd = receita.aguardandoAprovacaoQtd ?? 0;
    const valor =
      receita.aguardandoAprovacaoValor != null &&
      Number.isFinite(receita.aguardandoAprovacaoValor)
        ? receita.aguardandoAprovacaoValor
        : null;
    byKey.set("intel:os-aprovacao", {
      id: "intel:os-aprovacao",
      priority: qtd >= 5 ? "alta" : "media",
      title: "Cobrar aprovações pendentes",
      description:
        valor != null && valor > 0
          ? `${qtd} OS · valor estimado ${money(valor)}.`
          : `${qtd} OS aguardando aprovação do cliente.`,
      impactValue: valor != null && valor > 0 ? valor : null,
      actionLabel: "Abrir OS",
      href: `/${slug}/ordens?status=aguardando_aprovacao`,
      source: "receita-potencial",
      score: qtd >= 5 ? 100 : 75,
    });
  }

  // Pressão de caixa — preferir Cockpit 7d; fallback radar mensal da inteligência.
  const cock = input.cockpit;
  if (cock && cock.saude === "critico") {
    const gap = Math.abs(cock.dias7.saldoProjetado ?? 0);
    byKey.set("cockpit:fluxo-pressionado", {
      id: "cockpit:fluxo-pressionado",
      priority: "alta",
      title: "Proteger o caixa nos próximos dias",
      description: cock.saudeReason,
      impactValue: gap > 0 ? gap : null,
      actionLabel: "Abrir financeiro",
      href: `/${slug}/financeiro/fluxo-caixa`,
      source: "financial-cockpit",
      score: 110,
    });
  } else if (cock && cock.saude === "atencao" && (cock.vencidas?.pagarValor ?? 0) > 0) {
    byKey.set("cockpit:fluxo-pressionado", {
      id: "cockpit:fluxo-pressionado",
      priority: "media",
      title: "Revisar compromissos financeiros",
      description: cock.saudeReason,
      impactValue: cock.vencidas?.pagarValor ?? null,
      actionLabel: "Ver contas a pagar",
      href: `/${slug}/financeiro/contas-pagar`,
      source: "financial-cockpit",
      score: 72,
    });
  } else {
    const radar = input.intelligence.radarFinanceiro;
    if (radar.status === "available") {
      const entradas = radar.entradasPrevistas ?? 0;
      const saidas = radar.saidasPrevistas ?? 0;
      const saldo = radar.saldoProjetado ?? 0;
      const pressionado = saldo < 0 || (saidas > 0 && saidas > entradas);
      if (pressionado) {
        const gap = Math.max(saidas - entradas, Math.abs(Math.min(saldo, 0)));
        byKey.set("intel:fluxo-pressionado", {
          id: "intel:fluxo-pressionado",
          priority: saldo < 0 ? "alta" : "media",
          title: "Proteger o caixa do período",
          description:
            saldo < 0
              ? `Saldo projetado negativo (${money(saldo)}).`
              : `Saídas previstas acima das entradas no mês.`,
          impactValue: gap > 0 ? gap : null,
          actionLabel: "Abrir financeiro",
          href: `/${slug}/financeiro/fluxo-caixa`,
          source: "radar-financeiro",
          score: saldo < 0 ? 110 : 72,
        });
      }
    }
  }

  return {
    recommendations: sortRecs([...byKey.values()]).slice(0, MAX_ITEMS),
  };
}
