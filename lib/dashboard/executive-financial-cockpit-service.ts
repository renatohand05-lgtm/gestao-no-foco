/**
 * Composição pura do Cockpit Financeiro (Gate 17.2 / 17.2.1).
 *
 * Saúde do caixa (determinística):
 * - indisponivel: sem saldo bancário confiável
 * - critico: saldo projetado 7d < 0 OU (pagar vencido > saldo atual)
 * - atencao: títulos vencidos OU projeção 7d muito baixa OU horizonte 7d ausente
 * - saudavel: saldo disponível, projeção 7d ≥ 0 e sem vencidos (nunca com dados incompletos)
 *
 * Projeções: exclusivamente FluxoCaixaResumo (sem fórmula paralela).
 * Maior compromisso: calcSaldoPendente (utils oficiais); fallback valor_original.
 */

import type { ExecutiveDashboardContext } from "./executive-dashboard-context-service";
import type {
  CashHealthStatus,
  ExecutiveFinancialCockpitData,
  FinancialHorizon,
} from "./executive-financial-cockpit-types";
import type { FluxoCaixaResumo } from "@/types/fluxo-caixa";

/** Espelha EXECUTIVE_STATUS_LABEL — inline p/ Node tests (sem alias/@). */
const STATUS_LABEL = {
  critico: "Crítico",
  atencao: "Atenção",
  saudavel: "Saudável",
} as const;

function horizonFrom(resumo: FluxoCaixaResumo | null): FinancialHorizon {
  if (!resumo) {
    return {
      entradasPrevistas: null,
      saidasPrevistas: null,
      saldoProjetado: null,
    };
  }
  return {
    entradasPrevistas: resumo.entradas_previstas,
    saidasPrevistas: resumo.saidas_previstas,
    saldoProjetado: resumo.saldo_projetado,
  };
}

export function classifyCashHealth(input: {
  saldoAtual: number | null;
  proj7: number | null;
  pagarVencido: number;
  receberVencido: number;
}): { status: CashHealthStatus; label: string; reason: string } {
  if (input.saldoAtual == null) {
    return {
      status: "indisponivel",
      label: "Indisponível",
      reason: "Saúde indisponível — saldo bancário não informado.",
    };
  }

  const pagarV = input.pagarVencido;
  const receberV = input.receberVencido;
  const proj7 = input.proj7;

  if (proj7 != null && proj7 < 0) {
    return {
      status: "critico",
      label: STATUS_LABEL.critico,
      reason: "Saldo projetado em 7 dias negativo.",
    };
  }

  if (pagarV > 0 && input.saldoAtual < pagarV) {
    return {
      status: "critico",
      label: STATUS_LABEL.critico,
      reason: "Contas a pagar vencidas superam o saldo atual.",
    };
  }

  if (pagarV > 0 || receberV > 0) {
    return {
      status: "atencao",
      label: STATUS_LABEL.atencao,
      reason: "Há títulos vencidos a regularizar.",
    };
  }

  if (proj7 == null) {
    return {
      status: "atencao",
      label: STATUS_LABEL.atencao,
      reason: "Projeção parcial — horizonte de 7 dias indisponível.",
    };
  }

  if (input.saldoAtual > 0 && proj7 < input.saldoAtual * 0.2) {
    return {
      status: "atencao",
      label: STATUS_LABEL.atencao,
      reason: "Projeção de 7 dias muito abaixo do saldo atual.",
    };
  }

  return {
    status: "saudavel",
    label: STATUS_LABEL.saudavel,
    reason: "Saldo positivo e sem vencidos no horizonte.",
  };
}

export function composeExecutiveFinancialCockpit(
  ctx: ExecutiveDashboardContext,
): ExecutiveFinancialCockpitData {
  const saldoAtual =
    ctx.temContaBancaria === true
      ? (ctx.fluxo7d?.saldo_atual ??
        ctx.fluxo30d?.saldo_atual ??
        ctx.fluxoMes?.saldo_atual ??
        null)
      : null;

  const hasAnyFluxo = Boolean(ctx.fluxo7d || ctx.fluxo30d || ctx.fluxoMes);
  const hasTitulos = Boolean(ctx.pagar || ctx.receber);

  if (!hasAnyFluxo && !hasTitulos) {
    return {
      status: "unavailable",
      notice: "Dados indisponíveis",
      saldoAtual: null,
      hoje: horizonFrom(null),
      dias7: horizonFrom(null),
      dias30: horizonFrom(null),
      vencidas: null,
      maiorCompromisso7d: null,
      receber30dVisaoParcial: true,
      saude: "indisponivel",
      saudeLabel: "Indisponível",
      saudeReason: "Não foi possível carregar dados financeiros.",
    };
  }

  const dias7 = horizonFrom(ctx.fluxo7d);
  const dias30 = horizonFrom(ctx.fluxo30d);
  const hoje: FinancialHorizon = {
    entradasPrevistas: null,
    saidasPrevistas: null,
    saldoProjetado: saldoAtual,
  };

  // CR não tem proximos_30 no getResumo — entradas 30d do fluxo = visão parcial do detalhe CR.
  const receber30dVisaoParcial = true;

  let notice: string | null = null;
  let status: ExecutiveFinancialCockpitData["status"] = "available";

  if (saldoAtual == null) {
    status = "partial";
    notice = "Projeção parcial — saldo bancário indisponível.";
  } else if (!ctx.fluxo7d || !ctx.fluxo30d) {
    status = "partial";
    notice = "Projeção parcial.";
  }

  const vencidas =
    ctx.pagar || ctx.receber
      ? {
          pagarQtd: ctx.pagar?.quantidade_vencido ?? 0,
          pagarValor: ctx.pagar?.total_vencido ?? 0,
          receberQtd: ctx.receber?.quantidade_vencido ?? 0,
          receberValor: ctx.receber?.total_vencido ?? 0,
        }
      : null;

  const health = classifyCashHealth({
    saldoAtual,
    proj7: dias7.saldoProjetado,
    pagarVencido: vencidas?.pagarValor ?? 0,
    receberVencido: vencidas?.receberValor ?? 0,
  });

  const maior = ctx.maiorCompromisso7d
    ? {
        descricao: ctx.maiorCompromisso7d.descricao,
        fornecedorNome: ctx.maiorCompromisso7d.fornecedorNome,
        valor: ctx.maiorCompromisso7d.valor,
        dataVencimento: ctx.maiorCompromisso7d.dataVencimento,
        valorSource: ctx.maiorCompromisso7d.valorSource,
      }
    : null;

  return {
    status,
    notice,
    saldoAtual,
    hoje,
    dias7,
    dias30,
    vencidas,
    maiorCompromisso7d: maior,
    receber30dVisaoParcial,
    saude: health.status,
    saudeLabel: health.label,
    saudeReason: health.reason,
  };
}

/** Helper testável — escolhe maior compromisso por saldo pendente. */
export function pickMaiorCompromisso(
  rows: Array<{
    id: string;
    descricao: string;
    fornecedor_nome: string | null;
    data_vencimento: string;
    valor_original: number;
    desconto: number;
    juros: number;
    multa: number;
    valor_pago: number;
  }>,
  calcSaldo: (row: {
    valor_original: number;
    desconto: number;
    juros: number;
    multa: number;
    valor_pago: number;
  }) => number,
): {
  id: string;
  valor: number;
  valorSource: "saldo_pendente" | "valor_original";
} | null {
  let best: {
    id: string;
    valor: number;
    valorSource: "saldo_pendente" | "valor_original";
  } | null = null;
  for (const row of rows) {
    const saldo = calcSaldo(row);
    const useSaldo = Number.isFinite(saldo) && saldo >= 0;
    const valor = useSaldo ? saldo : Number(row.valor_original) || 0;
    const valorSource = useSaldo
      ? ("saldo_pendente" as const)
      : ("valor_original" as const);
    if (!best || valor > best.valor) {
      best = { id: row.id, valor, valorSource };
    }
  }
  return best;
}
