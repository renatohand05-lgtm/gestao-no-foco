import {
  buildExecutiveDecisionItems,
  type BuildDecisionInput,
  type DecisionEstoqueInput,
  type DecisionFinanceiroInput,
  type DecisionOficinaInput,
  type DecisionRecursosInput,
} from "@/lib/dashboard/executive-decision-rules";
import type { ExecutiveDecisionResult } from "@/lib/dashboard/executive-decision-types";
import type { DashboardHojeSnapshot } from "@/lib/dashboard/vendas-dia-service";
import type { ResumoVendasMesData } from "@/lib/dashboard/resumo-vendas-mes-service";
import {
  loadExecutiveDashboardContext,
  toDecisionFeeds,
} from "@/lib/dashboard/executive-dashboard-context-service";

export type ExecutiveDecisionFeeds = {
  oficina: DecisionOficinaInput | null;
  estoque: DecisionEstoqueInput | null;
  financeiro: DecisionFinanceiroInput | null;
  recursos: DecisionRecursosInput | null;
};

/**
 * Feeds do Centro de Decisão via contexto unificado.
 * No dashboard principal, preferir loadExecutiveDashboardContext uma vez.
 */
export async function loadExecutiveDecisionFeeds(
  tenantId: string,
  tenantSlug: string,
): Promise<ExecutiveDecisionFeeds> {
  const ctx = await loadExecutiveDashboardContext(tenantId, tenantSlug);
  return toDecisionFeeds(ctx);
}

export function composeExecutiveDecision(input: {
  tenantSlug: string;
  hoje: DashboardHojeSnapshot;
  resumo: ResumoVendasMesData;
  feeds: ExecutiveDecisionFeeds;
}): ExecutiveDecisionResult {
  const diasDecorridos = input.resumo.rows.filter((r) => r.kind !== "futuro")
    .length;
  const payload: BuildDecisionInput = {
    tenantSlug: input.tenantSlug,
    hoje: {
      meta: input.hoje.hoje.meta,
      faturamento: input.hoje.hoje.faturamento,
      percentual: input.hoje.hoje.percentual,
      dataHoje: input.hoje.data_hoje,
    },
    mes: {
      metaMensal: input.resumo.meta_mensal,
      realizadoAcumulado: input.resumo.total.realizado_acumulado,
      diasDecorridos,
      diasTotais: input.resumo.rows.length,
      projecaoFechamento: input.hoje.mes.projecao_fechamento,
    },
    oficina: input.feeds.oficina,
    estoque: input.feeds.estoque,
    financeiro: input.feeds.financeiro,
    recursos: input.feeds.recursos,
  };
  return buildExecutiveDecisionItems(payload);
}
