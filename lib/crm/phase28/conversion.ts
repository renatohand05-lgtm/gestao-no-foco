/**
 * Fase 28.1 / 28.9 — Contratos de conversão CRM.
 * Execução: conversion-service + conversion-actions.
 */

export type ConversionStatus =
  | "ok"
  | "nao_configurado"
  | "indisponivel"
  | "aguardando_integracao";

export type ConversionResult = {
  ok: boolean;
  status: ConversionStatus;
  message: string;
  targetStage?: string;
};

/** Lead → cliente comercial: avança estágio na mesma linha de `clientes`. */
export function planLeadToCliente(currentStage: string): ConversionResult {
  if (currentStage !== "lead") {
    return {
      ok: false,
      status: "indisponivel",
      message: "Somente leads (estágio lead) podem ser convertidos por este fluxo.",
    };
  }
  return {
    ok: true,
    status: "ok",
    message: "Avançar estagio_funil para contato (sem duplicar cadastro).",
    targetStage: "contato",
  };
}

/** Oportunidade → orçamento de venda (wired em 28.9). */
export function planOportunidadeToOrcamento(): ConversionResult {
  return {
    ok: true,
    status: "ok",
    message:
      "Criar venda status orcamento vinculada ao cliente da oportunidade (idempotente via marcador).",
  };
}

/** Orçamento → venda / OS (wired em 28.9). */
export function planOrcamentoToVendaOuOs(
  destino: "venda" | "os",
): ConversionResult {
  return {
    ok: true,
    status: "ok",
    message:
      destino === "venda"
        ? "Avançar orçamento para venda em andamento (sem faturar / sem estoque)."
        : "Abrir OS a partir do orçamento (requer veículo; sem baixar estoque).",
  };
}

export const EXTERNAL_CHANNEL_CONTRACTS = [
  { channel: "whatsapp", status: "aguardando_integracao" as const },
  { channel: "email", status: "nao_configurado" as const },
  { channel: "telefonia", status: "nao_configurado" as const },
  { channel: "calendario", status: "ok" as const },
  { channel: "ia", status: "nao_configurado" as const },
] as const;
