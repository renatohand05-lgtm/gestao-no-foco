/**
 * ActionPlanEngine (Sprint 11.7)
 * Plano executivo automático — composição determinística dos motores existentes.
 * Sem IA externa · sem recálculo · sem I/O.
 */

import type { BusinessIntelligenceResult } from "@/lib/business-intelligence";
import type { CopilotEngineResult } from "@/lib/copilot";
import type { ExecutiveIntelligenceResult } from "@/lib/intelligence/types";
import type { PredictionEngineResult } from "@/lib/predictions";
import type { TimelineEngineResult } from "@/lib/timeline-engine";
import {
  ACTION_PLAN_MAX_TASKS,
  type ActionPlanCategory,
  type ActionPlanDifficulty,
  type ActionPlanPriority,
  type ActionPlanResult,
  type ActionTask,
} from "@/lib/action-plan/types";

export type ActionPlanEngineInput = {
  intelligence: ExecutiveIntelligenceResult;
  business: BusinessIntelligenceResult;
  predictions: PredictionEngineResult;
  timeline: TimelineEngineResult;
  copilot: CopilotEngineResult;
};

const PRIORITY_ORDER: Record<ActionPlanPriority, number> = {
  Critica: 0,
  Alta: 1,
  Media: 2,
  Baixa: 3,
};

function inferCategory(text: string): ActionPlanCategory {
  const t = text.toLowerCase();
  if (t.includes("ticket")) return "Ticket";
  if (t.includes("cmv") || t.includes("custo")) return "CMV";
  if (t.includes("folha") || t.includes("pessoal")) return "Folha";
  if (t.includes("financeiro") || t.includes("caixa") || t.includes("receber"))
    return "Financeiro";
  if (t.includes("cliente")) return "Cliente";
  if (
    t.includes("operac") ||
    t.includes("ritmo") ||
    t.includes("dias úteis") ||
    t.includes("dias uteis")
  ) {
    return "Operacao";
  }
  if (
    t.includes("venda") ||
    t.includes("meta") ||
    t.includes("fatur") ||
    t.includes("média diária") ||
    t.includes("media diaria")
  ) {
    return "Venda";
  }
  return "Performance";
}

function inferResponsible(category: ActionPlanCategory): string {
  switch (category) {
    case "Venda":
      return "Comercial";
    case "Ticket":
      return "Comercial / Precificação";
    case "CMV":
      return "Operações / Compras";
    case "Folha":
      return "RH / Gestão";
    case "Financeiro":
      return "Financeiro";
    case "Cliente":
      return "Sucesso do Cliente";
    case "Operacao":
      return "Operações";
    default:
      return "Diretoria / Gestor responsável";
  }
}

function inferDifficulty(
  priority: ActionPlanPriority,
  text: string,
): ActionPlanDifficulty {
  const t = text.toLowerCase();
  if (
    t.includes("impossível") ||
    t.includes("impossivel") ||
    t.includes("312%") ||
    priority === "Critica"
  ) {
    return "alta";
  }
  if (priority === "Alta" || t.includes("agressivo")) return "media";
  return "baixa";
}

function mapPriorityFromAction(
  severity: "critical" | "important" | "positive" | "neutral",
): ActionPlanPriority {
  if (severity === "critical") return "Critica";
  if (severity === "important") return "Alta";
  if (severity === "positive") return "Baixa";
  return "Media";
}

function mapPriorityFromBusiness(
  level: "alta" | "media" | "baixa" | string,
): ActionPlanPriority {
  if (level === "alta") return "Alta";
  if (level === "baixa") return "Baixa";
  return "Media";
}

function pushTask(bag: ActionTask[], task: ActionTask) {
  if (bag.some((t) => t.id === task.id)) return;
  if (
    bag.some(
      (t) => t.title.toLowerCase() === task.title.toLowerCase(),
    )
  ) {
    return;
  }
  bag.push(task);
}

/**
 * Gera até 5 ações do plano executivo a partir dos motores já carregados.
 */
export function buildActionPlan(
  input: ActionPlanEngineInput,
): ActionPlanResult {
  const { intelligence, business, predictions, timeline, copilot } = input;
  const tasks: ActionTask[] = [];

  const prazoBase =
    intelligence.timeline.remainingBusinessDays > 0
      ? `Próximos ${intelligence.timeline.remainingBusinessDays} dias úteis`
      : "Revisar no fechamento da competência";

  // 1) Ação principal da EI
  {
    const a = intelligence.action;
    const category = inferCategory(`${a.title} ${a.description}`);
    const priority = mapPriorityFromAction(a.severity);
    pushTask(tasks, {
      id: "plan-ei-action",
      priority,
      category,
      title: a.title,
      motivo: a.rationale,
      impactoEsperado: a.description,
      prazo: prazoBase,
      responsavelSugerido: inferResponsible(category),
      dificuldade: inferDifficulty(priority, `${a.title} ${a.description}`),
      status: "pendente",
      fontes: ["executive_intelligence"],
      rank: PRIORITY_ORDER[priority],
    });
  }

  // 2) Prioridades de BI
  for (const p of business.priorities.slice(0, 2)) {
    const category = inferCategory(`${p.title} ${p.description}`);
    const priority = mapPriorityFromBusiness(p.priority);
    pushTask(tasks, {
      id: `plan-bi-${p.id}`,
      priority,
      category,
      title: p.title,
      motivo: p.description,
      impactoEsperado: p.estimatedImpact,
      prazo: prazoBase,
      responsavelSugerido: inferResponsible(category),
      dificuldade: inferDifficulty(priority, p.description),
      status: "pendente",
      fontes: ["business_intelligence"],
      rank: PRIORITY_ORDER[priority] + 0.1,
    });
  }

  // 3) Risco alto → ação de mitigação
  const topRisk = business.risks.find((r) => r.severity === "alta");
  if (topRisk) {
    const category = inferCategory(`${topRisk.title} ${topRisk.description}`);
    pushTask(tasks, {
      id: `plan-risk-${topRisk.id}`,
      priority: "Critica",
      category,
      title: `Mitigar: ${topRisk.title}`,
      motivo: topRisk.description,
      impactoEsperado: topRisk.impact,
      prazo: "Imediato / esta semana útil",
      responsavelSugerido: inferResponsible(category),
      dificuldade: "alta",
      status: "pendente",
      fontes: ["business_intelligence", "timeline"],
      rank: 0,
    });
  }

  // 4) Recomendação de previsão
  if (predictions.recommendation) {
    const rec = predictions.recommendation;
    const category = inferCategory(`${rec.title} ${rec.rationale}`);
    const priority: ActionPlanPriority =
      rec.confidence === "baixa" ? "Alta" : "Media";
    pushTask(tasks, {
      id: "plan-pred-rec",
      priority,
      category,
      title: rec.title,
      motivo: rec.rationale,
      impactoEsperado: rec.expectedImpact,
      prazo: intelligence.timeline.remainingBusinessDays > 0
        ? prazoBase
        : "Validar no próximo ciclo",
      responsavelSugerido: inferResponsible(category),
      dificuldade: inferDifficulty(priority, rec.effort + rec.risk),
      status: "pendente",
      fontes: ["prediction_engine"],
      rank: PRIORITY_ORDER[priority] + 0.2,
    });
  }

  // 5) Alert de meta necessária
  if (predictions.requiredForMeta.alert) {
    pushTask(tasks, {
      id: "plan-required-meta",
      priority:
        predictions.requiredForMeta.viability === "impossivel" ||
        predictions.requiredForMeta.viability === "improvavel"
          ? "Critica"
          : "Alta",
      category: "Venda",
      title: "Alinhar ritmo diário ao necessário da meta",
      motivo: predictions.requiredForMeta.alert,
      impactoEsperado:
        predictions.requiredForMeta.assumptions[0] ??
        "Reduzir o gap residual até o fechamento.",
      prazo: prazoBase,
      responsavelSugerido: "Comercial",
      dificuldade:
        predictions.requiredForMeta.viability === "viavel" ? "media" : "alta",
      status: "pendente",
      fontes: ["prediction_engine", "business_intelligence"],
      rank: 0.5,
    });
  }

  // 6) Copilot próximas ações (complemento)
  for (const [idx, r] of copilot.responses.entries()) {
    const category = inferCategory(`${r.headline} ${r.proximaAcao}`);
    pushTask(tasks, {
      id: `plan-copilot-${r.id}`,
      priority: idx === 0 ? "Alta" : "Media",
      category,
      title: r.proximaAcao,
      motivo: r.resposta,
      impactoEsperado: r.evidencias[0] ?? r.headline,
      prazo: prazoBase,
      responsavelSugerido: inferResponsible(category),
      dificuldade: r.confidence === "baixa" ? "media" : "baixa",
      status: "pendente",
      fontes: ["copilot", ...r.fontes],
      rank: 2 + idx,
    });
  }

  // 7) Evento crítico da timeline
  const criticalEvent = timeline.visible.find(
    (e) => e.priority === "CRITICA" || e.tone === "Danger",
  );
  if (criticalEvent) {
    const category = inferCategory(
      `${criticalEvent.title} ${criticalEvent.description}`,
    );
    pushTask(tasks, {
      id: `plan-tl-${criticalEvent.id}`,
      priority: "Critica",
      category,
      title: `Atuar sobre: ${criticalEvent.title}`,
      motivo: criticalEvent.description,
      impactoEsperado: criticalEvent.impact,
      prazo: criticalEvent.timestamp ?? "Imediato",
      responsavelSugerido: inferResponsible(category),
      dificuldade: "alta",
      status: "pendente",
      fontes: ["timeline"],
      rank: 0.3,
    });
  }

  // 8) Oportunidade (baixa prioridade)
  const opp = business.opportunities[0];
  if (opp) {
    const category = inferCategory(`${opp.title} ${opp.description}`);
    pushTask(tasks, {
      id: `plan-opp-${opp.id}`,
      priority: "Baixa",
      category,
      title: opp.title,
      motivo: opp.description,
      impactoEsperado: opp.estimatedImpact,
      prazo: prazoBase,
      responsavelSugerido: inferResponsible(category),
      dificuldade: "baixa",
      status: "pendente",
      fontes: ["business_intelligence"],
      rank: 4,
    });
  }

  const sorted = [...tasks]
    .sort((a, b) => a.rank - b.rank || PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
    .slice(0, ACTION_PLAN_MAX_TASKS);

  const criticaCount = sorted.filter((t) => t.priority === "Critica").length;
  const summary =
    sorted.length === 0
      ? "Nenhuma ação automática disponível com os dados atuais."
      : `Plano com ${sorted.length} ação(ões)${
          criticaCount > 0 ? ` · ${criticaCount} crítica(s)` : ""
        }, derivado dos motores já carregados.`;

  return { tasks: sorted, summary };
}
