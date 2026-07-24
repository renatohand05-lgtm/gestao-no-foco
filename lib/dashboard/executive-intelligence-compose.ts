/**
 * Composição pura da Inteligência Executiva (Gate 16.3 / 17.2).
 * Panorama: receita potencial + saúde — sem listas de alertas nem radar (Cockpit).
 */

import type { ExecutiveIntelligenceData } from "@/lib/dashboard/executive-intelligence-types";
import type { CentroOperacoesData } from "@/lib/operacoes/centro-operacoes-service";
import type { FluxoCaixaResumo } from "@/types/fluxo-caixa";

function sumValorEstimado(
  cards: { valorEstimado: number; status: string }[] | undefined,
  status?: string,
) {
  if (!cards?.length) return { valor: 0, qtd: 0 };
  let valor = 0;
  let qtd = 0;
  for (const c of cards) {
    if (status && c.status !== status) continue;
    valor += Number(c.valorEstimado) || 0;
    qtd += 1;
  }
  return { valor, qtd };
}

function cardCount(centro: CentroOperacoesData, key: string) {
  return centro.cards.find((c) => c.key === key)?.count ?? 0;
}

export function composeExecutiveIntelligence(input: {
  /** Ignorado no 17.2 — prioridades vivem no Plano de Ação. */
  priorities?: unknown;
  centro: CentroOperacoesData | null;
  fluxoResumo: FluxoCaixaResumo | null;
}): ExecutiveIntelligenceData {
  let receitaPotencial: ExecutiveIntelligenceData["receitaPotencial"];
  let saudeOperacao: ExecutiveIntelligenceData["saudeOperacao"];

  if (!input.centro) {
    receitaPotencial = {
      status: "unavailable",
      aguardandoAprovacaoValor: null,
      aguardandoAprovacaoQtd: null,
      orcamentosPendentesValor: null,
      orcamentosPendentesQtd: null,
      totalValor: null,
    };
    saudeOperacao = {
      status: "unavailable",
      osAbertas: null,
      osAtrasadas: null,
      osAguardandoCliente: null,
      clientesAguardandoRetorno: null,
    };
  } else {
    const aprov = sumValorEstimado(
      input.centro.board.aprovacao,
      "aguardando_aprovacao",
    );
    const orc = sumValorEstimado(
      input.centro.board.orcamento,
      "aguardando_orcamento",
    );
    let osAguardandoCliente = 0;
    for (const col of Object.values(input.centro.board)) {
      for (const os of col) {
        if (os.status === "aguardando_cliente") osAguardandoCliente += 1;
      }
    }

    receitaPotencial = {
      status: "partial",
      // valor_total da OS ≠ valor em aprovação — não inventar R$.
      aguardandoAprovacaoValor: null,
      aguardandoAprovacaoQtd: aprov.qtd,
      orcamentosPendentesValor: null,
      orcamentosPendentesQtd: orc.qtd,
      totalValor: null,
    };
    saudeOperacao = {
      status: "available",
      osAbertas: cardCount(input.centro, "abertas"),
      osAtrasadas: cardCount(input.centro, "atrasadas"),
      osAguardandoCliente,
      clientesAguardandoRetorno: osAguardandoCliente,
    };
  }

  // Radar ainda preenchido para fallback do Plano de Ação; UI do Radar saiu (Cockpit).
  const radarFinanceiro: ExecutiveIntelligenceData["radarFinanceiro"] =
    input.fluxoResumo
      ? {
          status: "available",
          entradasPrevistas: input.fluxoResumo.entradas_previstas,
          saidasPrevistas: input.fluxoResumo.saidas_previstas,
          saldoProjetado: input.fluxoResumo.saldo_projetado,
        }
      : {
          status: "unavailable",
          entradasPrevistas: null,
          saidasPrevistas: null,
          saldoProjetado: null,
        };

  return {
    receitaPotencial,
    prioridadesDoDia: { status: "available", items: [] },
    radarFinanceiro,
    saudeOperacao,
  };
}
