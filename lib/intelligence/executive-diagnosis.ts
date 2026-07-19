import { formatCurrency } from "@/lib/dashboard/format";
import type {
  ExecutiveDiagnosisResult,
  ExecutiveIntelligenceInput,
  ExecutiveTone,
} from "@/lib/intelligence/types";

function ritmoTone(pp: number | null): ExecutiveTone {
  if (pp === null) return "neutral";
  if (pp <= -25) return "danger";
  if (pp < -10) return "warning";
  if (pp > 10) return "success";
  return "info";
}

/**
 * Diagnóstico executivo determinístico.
 */
export function buildExecutiveDiagnosis(
  input: ExecutiveIntelligenceInput,
): ExecutiveDiagnosisResult {
  if (!input.possuiMeta) {
    return {
      summary: "Ainda não há meta mensal para diagnosticar o desempenho.",
      findings: [
        { label: "Meta", value: "Não cadastrada", tone: "info" },
        {
          label: "Realizado",
          value: formatCurrency(input.realizado),
          tone: "neutral",
        },
        {
          label: "Vendas",
          value: String(input.vendasQuantidade),
          tone: "neutral",
        },
      ],
      primaryCause: "Ausência de meta mensal cadastrada.",
      conclusion: "Cadastre a meta para obter diagnóstico completo.",
    };
  }

  if (input.periodoFuturo) {
    return {
      summary: "O período selecionado ainda não começou.",
      findings: [
        { label: "Status", value: "Futuro", tone: "info" },
        {
          label: "Meta",
          value:
            input.metaMensal === null ? "—" : formatCurrency(input.metaMensal),
          tone: "neutral",
        },
      ],
      primaryCause: "Competência futura.",
      conclusion: "Aguarde o início do mês para avaliar o ritmo.",
    };
  }

  const ritmoLabel =
    input.diferencaRitmoPp === null
      ? "—"
      : `${input.diferencaRitmoPp > 0 ? "+" : ""}${input.diferencaRitmoPp.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} p.p.`;

  const projBelow =
    input.metaMensal !== null &&
    input.metaMensal > 0 &&
    input.projecaoDiasUteis < input.metaMensal;

  const belowRhythm =
    input.diferencaRitmoPp !== null && input.diferencaRitmoPp < -10;

  const lowConfidence = input.confianca === "baixa";

  let summary: string;
  if (
    input.atingimentoPercentual !== null &&
    input.atingimentoPercentual >= 100
  ) {
    summary = "A meta do mês já foi atingida.";
  } else if (belowRhythm) {
    summary = "O desempenho comercial está abaixo do ritmo esperado.";
  } else if (projBelow) {
    summary = "A projeção útil ainda aponta fechamento abaixo da meta.";
  } else {
    summary = "O desempenho comercial está no ritmo ou próximo do esperado.";
  }

  if (lowConfidence) {
    summary += " A leitura ainda tem confiança limitada.";
  }

  const findings = [
    {
      label: "Ritmo",
      value: ritmoLabel,
      tone: ritmoTone(input.diferencaRitmoPp),
    },
    {
      label: "Tendência",
      value: input.tendencia,
      tone:
        input.tendencia === "crescente"
          ? ("success" as const)
          : input.tendencia === "decrescente"
            ? ("warning" as const)
            : ("neutral" as const),
    },
    {
      label: "Confiança",
      value: input.confianca,
      tone:
        input.confianca === "alta"
          ? ("success" as const)
          : input.confianca === "baixa"
            ? ("warning" as const)
            : ("info" as const),
    },
    {
      label: "Projeção",
      value: projBelow ? "Abaixo da meta" : "No alvo ou acima",
      tone: projBelow ? ("warning" as const) : ("success" as const),
    },
  ];

  let primaryCause: string;
  if (belowRhythm) {
    primaryCause =
      "Faturamento acumulado insuficiente para o ponto atual do mês.";
  } else if (input.tendencia === "decrescente") {
    primaryCause = "Desaceleração na janela recente de vendas.";
  } else if (
    input.ticketVariacaoPct !== null &&
    input.ticketVariacaoPct < -5
  ) {
    primaryCause = "Queda do ticket médio pressionando a receita.";
  } else if (projBelow) {
    primaryCause = "Projeção útil abaixo da meta cadastrada.";
  } else {
    primaryCause = "Sem fator dominante de risco no momento.";
  }

  let conclusion: string;
  if (
    input.atingimentoPercentual !== null &&
    input.atingimentoPercentual >= 100
  ) {
    conclusion = "Prioridade: proteger o ticket e manter a qualidade.";
  } else if (input.necessarioDiaUtil !== null && input.diasUteisRestantes > 0) {
    conclusion = lowConfidence
      ? "Prioridade sugerida: aumentar a média diária útil, com cautela pela baixa confiança."
      : "A prioridade é aumentar a média diária útil.";
  } else {
    conclusion = "Mantenha o acompanhamento diário do ritmo.";
  }

  return {
    summary,
    findings,
    primaryCause,
    conclusion,
  };
}
