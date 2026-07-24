/**
 * Contexto compartilhado do Dashboard Executivo (Gate 17.2).
 * Um fetch por fonte — alimenta Decisão, Inteligência, Plano de Ação e Cockpit.
 */

import { createCentroOperacoesService } from "@/lib/operacoes/centro-operacoes-service";
import type { CentroOperacoesData } from "@/lib/operacoes/centro-operacoes-service";
import { createEstoqueDashboardService } from "@/lib/estoque/estoque-dashboard-service";
import { createContaPagarService } from "@/lib/financeiro/conta-pagar-service";
import { createContaReceberService } from "@/lib/financeiro/conta-receber-service";
import { createRecursosOcupacaoService } from "@/lib/operacoes/recursos-service";
import {
  createFluxoCaixaService,
  defaultFluxoCaixaPeriodo,
} from "@/lib/financeiro/fluxo-caixa-service";
import {
  addDays,
  calcSaldoPendente,
  todayISO,
} from "@/lib/financeiro/conta-pagar-utils";
import type { ContasPagarResumo } from "@/types/contas-pagar";
import type { ContasReceberResumo } from "@/types/contas-receber";
import type { FluxoCaixaResumo } from "@/types/fluxo-caixa";
import type {
  DecisionEstoqueInput,
  DecisionFinanceiroInput,
  DecisionOficinaInput,
  DecisionRecursosInput,
} from "@/lib/dashboard/executive-decision-rules";

async function soft<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

export type MaiorCompromisso7d = {
  id: string;
  descricao: string;
  fornecedorNome: string | null;
  valor: number;
  dataVencimento: string;
  /** Campo usado no valor exibido. */
  valorSource: "saldo_pendente" | "valor_original";
};

export type ExecutiveDashboardContext = {
  centro: CentroOperacoesData | null;
  estoque: DecisionEstoqueInput | null;
  pagar: ContasPagarResumo | null;
  receber: ContasReceberResumo | null;
  recursosRaw: Awaited<
    ReturnType<
      Awaited<ReturnType<typeof createRecursosOcupacaoService>>["getData"]
    >
  > | null;
  fluxoMes: FluxoCaixaResumo | null;
  fluxo7d: FluxoCaixaResumo | null;
  fluxo30d: FluxoCaixaResumo | null;
  maiorCompromisso7d: MaiorCompromisso7d | null;
  /** null = fluxo não carregou; false/true = saldo_atual presente. */
  temContaBancaria: boolean | null;
};

/** Carrega todas as fontes executivas uma vez (soft-fail por fonte). */
export async function loadExecutiveDashboardContext(
  tenantId: string,
  tenantSlug: string,
): Promise<ExecutiveDashboardContext> {
  const today = todayISO();
  const mes = defaultFluxoCaixaPeriodo();
  const ate7 = addDays(today, 6);
  const ate30 = addDays(today, 29);

  const [centro, estoqueSvc, pagarBundle, receber, recursosRaw, fluxoBundle] =
    await Promise.all([
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
        const [pagar, list] = await Promise.all([
          svc.getResumo(),
          svc.list({
            status: "aberto",
            vencimentoDe: addDays(today, 1),
            vencimentoAte: ate7,
            sort: "data_vencimento",
            order: "asc",
            perPage: 40,
            page: 1,
          }),
        ]);
        let maior: MaiorCompromisso7d | null = null;
        for (const row of list.data) {
          const saldo = calcSaldoPendente(row);
          const valor =
            Number.isFinite(saldo) && saldo >= 0
              ? saldo
              : Number(row.valor_original) || 0;
          const valorSource =
            Number.isFinite(saldo) && saldo >= 0
              ? ("saldo_pendente" as const)
              : ("valor_original" as const);
          if (!maior || valor > maior.valor) {
            maior = {
              id: row.id,
              descricao: row.descricao,
              fornecedorNome: row.fornecedor_nome,
              valor,
              dataVencimento: row.data_vencimento,
              valorSource,
            };
          }
        }
        return { pagar, maior };
      }),
      soft(async () => {
        const svc = await createContaReceberService(tenantId);
        return svc.getResumo();
      }),
      soft(async () => {
        const svc = await createRecursosOcupacaoService(tenantId);
        return svc.getData();
      }),
      soft(async () => {
        const svc = await createFluxoCaixaService(tenantId);
        const [mesR, d7, d30, contas] = await Promise.all([
          svc.getFluxo({
            dataDe: mes.dataDe,
            dataAte: mes.dataAte,
            includeItens: false,
          }),
          svc.getFluxo({
            dataDe: today,
            dataAte: ate7,
            includeItens: false,
          }),
          svc.getFluxo({
            dataDe: today,
            dataAte: ate30,
            includeItens: false,
          }),
          svc.listContasComSaldo(),
        ]);
        return {
          fluxoMes: mesR.resumo,
          fluxo7d: d7.resumo,
          fluxo30d: d30.resumo,
          contasAtivas: contas.filter((c) => c.ativo).length,
        };
      }),
    ]);

  const estoque: DecisionEstoqueInput | null = estoqueSvc
    ? {
        abaixoMinimo: estoqueSvc.kpis.abaixoMinimo,
        zerados: estoqueSvc.kpis.zerados,
      }
    : null;

  const temContaBancaria =
    fluxoBundle == null ? null : (fluxoBundle.contasAtivas ?? 0) > 0;

  return {
    centro,
    estoque,
    pagar: pagarBundle?.pagar ?? null,
    receber,
    recursosRaw,
    fluxoMes: fluxoBundle?.fluxoMes ?? null,
    fluxo7d: fluxoBundle?.fluxo7d ?? null,
    fluxo30d: fluxoBundle?.fluxo30d ?? null,
    maiorCompromisso7d: pagarBundle?.maior ?? null,
    temContaBancaria,
  };
}

function mapOficina(
  centro: CentroOperacoesData | null,
): DecisionOficinaInput | null {
  if (!centro) return null;
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
  return {
    aguardandoAprovacao: card("aprovacao"),
    aguardandoPecas: card("pecas"),
    aguardandoOrcamento: card("orcamento"),
    atrasadas: card("atrasadas"),
    semAtualizacao,
    maxHorasParada,
  };
}

function mapFinanceiro(
  pagar: ContasPagarResumo | null,
  receber: ContasReceberResumo | null,
): DecisionFinanceiroInput | null {
  if (!pagar && !receber) return null;
  return {
    pagarVencidoQtd: pagar?.quantidade_vencido ?? 0,
    pagarVencidoValor: pagar?.total_vencido ?? 0,
    pagarVencendoHojeQtd: pagar?.quantidade_vencendo_hoje ?? 0,
    pagarVencendoHojeValor: pagar?.vencendo_hoje ?? 0,
    receberVencidoQtd: receber?.quantidade_vencido ?? 0,
    receberVencidoValor: receber?.total_vencido ?? 0,
  };
}

function mapRecursos(
  recursos: ExecutiveDashboardContext["recursosRaw"],
  oficina: DecisionOficinaInput | null,
): DecisionRecursosInput | null {
  if (!recursos || recursos.migrationPending) return null;
  const filaOps = oficina
    ? oficina.aguardandoPecas + oficina.aguardandoAprovacao
    : 0;
  return {
    totalAtivos: recursos.kpis.total,
    disponivel: recursos.kpis.disponivel,
    ocupado: recursos.kpis.ocupado,
    reservado: recursos.kpis.reservado,
    taxaOcupacao: recursos.kpis.taxaOcupacao,
    filaOps,
  };
}

export function toDecisionFeeds(ctx: ExecutiveDashboardContext): {
  oficina: DecisionOficinaInput | null;
  estoque: DecisionEstoqueInput | null;
  financeiro: DecisionFinanceiroInput | null;
  recursos: DecisionRecursosInput | null;
} {
  const oficina = mapOficina(ctx.centro);
  return {
    oficina,
    estoque: ctx.estoque,
    financeiro: mapFinanceiro(ctx.pagar, ctx.receber),
    recursos: mapRecursos(ctx.recursosRaw, oficina),
  };
}

export function toIntelligenceFeeds(ctx: ExecutiveDashboardContext): {
  centro: CentroOperacoesData | null;
  fluxoResumo: FluxoCaixaResumo | null;
} {
  return {
    centro: ctx.centro,
    fluxoResumo: ctx.fluxoMes,
  };
}
