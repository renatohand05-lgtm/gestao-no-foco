import { createCentroOperacoesService } from "@/lib/operacoes/centro-operacoes-service";
import { createEstoqueDashboardService } from "@/lib/estoque/estoque-dashboard-service";
import { createContaPagarService } from "@/lib/financeiro/conta-pagar-service";
import { createContaReceberService } from "@/lib/financeiro/conta-receber-service";
import { createRecursosOcupacaoService } from "@/lib/operacoes/recursos-service";
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

async function soft<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

export type ExecutiveDecisionFeeds = {
  oficina: DecisionOficinaInput | null;
  estoque: DecisionEstoqueInput | null;
  financeiro: DecisionFinanceiroInput | null;
  recursos: DecisionRecursosInput | null;
};

/** Feeds auxiliares — falhas isoladas não derrubam o dashboard. */
export async function loadExecutiveDecisionFeeds(
  tenantId: string,
  tenantSlug: string,
): Promise<ExecutiveDecisionFeeds> {
  const [centro, estoqueSvc, pagar, receber, recursos] = await Promise.all([
    soft(async () => {
      const svc = await createCentroOperacoesService(tenantId);
      return svc.getData(tenantSlug);
    }),
    soft(async () => {
      const svc = await createEstoqueDashboardService(tenantId);
      return svc.getData({ tenantSlug });
    }),
    soft(async () => {
      const svc = await createContaPagarService(tenantId);
      return svc.getResumo();
    }),
    soft(async () => {
      const svc = await createContaReceberService(tenantId);
      return svc.getResumo();
    }),
    soft(async () => {
      const svc = await createRecursosOcupacaoService(tenantId);
      return svc.getData();
    }),
  ]);

  let oficina: DecisionOficinaInput | null = null;
  if (centro) {
    const card = (key: string) =>
      centro.cards.find((c) => c.key === key)?.count ?? 0;
    let semAtualizacao = 0;
    let maxHorasParada: number | null = null;
    for (const col of Object.values(centro.board)) {
      for (const os of col) {
        if (os.semAtualizacao) semAtualizacao += 1;
        if (os.horasNaEtapa != null) {
          maxHorasParada = Math.max(maxHorasParada ?? 0, os.horasNaEtapa);
        }
      }
    }
    oficina = {
      aguardandoAprovacao: card("aprovacao"),
      aguardandoPecas: card("pecas"),
      aguardandoOrcamento: card("orcamento"),
      atrasadas: card("atrasadas"),
      semAtualizacao,
      maxHorasParada,
    };
  }

  const estoque: DecisionEstoqueInput | null = estoqueSvc
    ? {
        abaixoMinimo: estoqueSvc.kpis.abaixoMinimo,
        zerados: estoqueSvc.kpis.zerados,
      }
    : null;

  const financeiro: DecisionFinanceiroInput | null =
    pagar || receber
      ? {
          pagarVencidoQtd: pagar?.quantidade_vencido ?? 0,
          pagarVencidoValor: pagar?.total_vencido ?? 0,
          pagarVencendoHojeQtd: pagar?.quantidade_vencendo_hoje ?? 0,
          pagarVencendoHojeValor: pagar?.vencendo_hoje ?? 0,
          receberVencidoQtd: receber?.quantidade_vencido ?? 0,
          receberVencidoValor: receber?.total_vencido ?? 0,
        }
      : null;

  let recursosIn: DecisionRecursosInput | null = null;
  if (recursos && !recursos.migrationPending) {
    const filaOps = oficina
      ? oficina.aguardandoPecas + oficina.aguardandoAprovacao
      : 0;
    recursosIn = {
      totalAtivos: recursos.kpis.total,
      disponivel: recursos.kpis.disponivel,
      ocupado: recursos.kpis.ocupado,
      reservado: recursos.kpis.reservado,
      taxaOcupacao: recursos.kpis.taxaOcupacao,
      filaOps,
    };
  }

  return { oficina, estoque, financeiro, recursos: recursosIn };
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
