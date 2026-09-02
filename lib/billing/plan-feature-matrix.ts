import "server-only";

import {
  COMMERCIAL_PLAN_SLUGS,
  type CommercialPlanSlug,
} from "./catalog.ts";

export type { CommercialPlanSlug } from "./catalog.ts";

/** Ordem dos planos, do mais básico ao mais completo. */
const PLAN_RANK: Record<CommercialPlanSlug, number> = {
  start: 0,
  essential: 1,
  management: 2,
  pro: 3,
  pro_plus_consulting: 4,
};

export type PlanFeatureId =
  | "crm"
  | "relatorios"
  | "financeiro_avancado"
  | "analytics_bi"
  | "tributario"
  | "integracoes"
  | "automacoes"
  | "inteligencia_ia"
  | "consultoria_humana";

export type PlanFeatureDef = {
  id: PlanFeatureId;
  label: string;
  /** A partir de qual plano (inclusive) o recurso fica liberado. */
  minPlanSlug: CommercialPlanSlug;
};

/**
 * Decisões tomadas em sessão com o dono do produto (Sprint plano Início):
 * - CORE (sempre liberado, todos os planos): Vendas, OS, Agenda, Estoque,
 *   Financeiro básico (caixa, contas a pagar/receber, fluxo de caixa, DRE,
 *   fornecedores) e Inteligência Comercial completa.
 * - Essencial: + CRM, Relatórios, Financeiro avançado (centros de custo,
 *   plano de contas, conciliação, despesas recorrentes, orçamento,
 *   transferências, 2ª conta bancária).
 * - Gestão: + Analytics/BI geral do negócio.
 * - Pro: + Tributário, Integrações, Automações.
 * - Pro Plus + Consultoria: + Inteligência/copiloto (assistente IA geral) e
 *   consultoria humana.
 */
export const PLAN_FEATURES: readonly PlanFeatureDef[] = [
  { id: "crm", label: "CRM", minPlanSlug: "essential" },
  { id: "relatorios", label: "Relatórios", minPlanSlug: "essential" },
  {
    id: "financeiro_avancado",
    label: "Financeiro avançado",
    minPlanSlug: "essential",
  },
  { id: "analytics_bi", label: "Analytics / BI", minPlanSlug: "management" },
  { id: "tributario", label: "Tributário", minPlanSlug: "pro" },
  { id: "integracoes", label: "Integrações", minPlanSlug: "pro" },
  { id: "automacoes", label: "Automações", minPlanSlug: "pro" },
  {
    id: "inteligencia_ia",
    label: "Inteligência / copiloto",
    minPlanSlug: "pro_plus_consulting",
  },
  {
    id: "consultoria_humana",
    label: "Consultoria humana",
    minPlanSlug: "pro_plus_consulting",
  },
];

/** Módulos operacionais CORE — sempre liberados, em qualquer plano. */
export const CORE_ALWAYS_UNLOCKED_LABELS: readonly string[] = [
  "Vendas",
  "Ordens de serviço",
  "Agenda",
  "Estoque",
  "Financeiro básico (caixa, contas, fluxo de caixa, DRE, fornecedores)",
  "Inteligência Comercial",
];

export function isFeatureUnlockedForPlan(
  featureId: PlanFeatureId,
  planSlug: CommercialPlanSlug,
): boolean {
  const feature = PLAN_FEATURES.find((f) => f.id === featureId);
  if (!feature) return false;
  return PLAN_RANK[planSlug] >= PLAN_RANK[feature.minPlanSlug];
}

export function featuresUnlockedForPlan(
  planSlug: CommercialPlanSlug,
): readonly PlanFeatureDef[] {
  return PLAN_FEATURES.filter(
    (f) => PLAN_RANK[planSlug] >= PLAN_RANK[f.minPlanSlug],
  );
}

export function featuresLockedForPlan(
  planSlug: CommercialPlanSlug,
): readonly PlanFeatureDef[] {
  return PLAN_FEATURES.filter(
    (f) => PLAN_RANK[planSlug] < PLAN_RANK[f.minPlanSlug],
  );
}

export function planSlugsOrdered(): readonly CommercialPlanSlug[] {
  return [...COMMERCIAL_PLAN_SLUGS].sort(
    (a, b) => PLAN_RANK[a] - PLAN_RANK[b],
  );
}
