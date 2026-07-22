/**
 * Centro de Decisão — tipos (Sprint 16 Gate 16.2).
 * Visual / priorização — não altera regras financeiras.
 */

export type DecisionSeverity =
  | "critical"
  | "warning"
  | "opportunity"
  | "info";

export type DecisionCategory =
  | "vendas"
  | "metas"
  | "oficina"
  | "financeiro"
  | "estoque"
  | "clientes"
  | "pessoas"
  | "operacao";

export type ExecutiveDecisionItem = {
  id: string;
  title: string;
  description: string;
  severity: DecisionSeverity;
  category: DecisionCategory;
  impactValue?: number | null;
  actionLabel?: string;
  href?: string;
  referenceDate?: string;
  source: string;
  /** Score interno para ordenação determinística. */
  score: number;
};

export type ExecutiveDecisionSummary = {
  headline: string;
  criticalCount: number;
  warningCount: number;
  opportunityCount: number;
  infoCount: number;
  totalCount: number;
};

export type ExecutiveDecisionResult = {
  items: ExecutiveDecisionItem[];
  summary: ExecutiveDecisionSummary;
  updatedAt: string;
};
