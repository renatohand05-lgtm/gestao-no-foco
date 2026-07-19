import { RETORNO_SERVICOS_META_PCT } from "@/types/qualidade-operacional";
import type { QualidadeOperacionalAlertInput } from "@/types/qualidade-operacional";
import type { IntelligenceAlert } from "@/types/intelligence";

const MECANICO_ALERTA_MIN_PCT = 3;
const CATEGORIA_RETORNO_MIN = 3;
const PRODUTO_GARANTIA_MIN = 2;

export function buildQualidadeOperacionalAlerts(
  input: QualidadeOperacionalAlertInput,
): IntelligenceAlert[] {
  const alerts: IntelligenceAlert[] = [];
  const base = `/${input.tenantSlug}`;

  if (
    input.kpi.totalServicosConcluidos > 0 &&
    input.kpi.taxaRetornoPct > RETORNO_SERVICOS_META_PCT
  ) {
    alerts.push({
      id: "retorno-acima-meta",
      priority: input.kpi.taxaRetornoPct > 5 ? "critical" : "high",
      category: "operacional",
      title: "Retorno acima da meta",
      description: `Taxa de retorno em ${input.kpi.taxaRetornoPct.toFixed(1)}% (${input.kpi.quantidadeRetornos} retornos / ${input.kpi.totalServicosConcluidos} serviços). Meta: <${RETORNO_SERVICOS_META_PCT}%.`,
      recommendation:
        "Analise os motivos de retorno e revise procedimentos de qualidade na oficina.",
      href: `${base}/ordens/qualidade-operacional`,
    });
  }

  const topMecanico = input.rankings.mecanicos[0];
  if (topMecanico && topMecanico.value >= MECANICO_ALERTA_MIN_PCT) {
    alerts.push({
      id: "mecanico-acima-media",
      priority: "high",
      category: "operacional",
      title: "Mecânico acima da média de retorno",
      description: `${topMecanico.label} com ${topMecanico.value.toFixed(1)}% de retorno (${topMecanico.quantidade ?? 0} ocorrência(s)).`,
      recommendation:
        "Revise os serviços executados por este mecânico e aplique treinamento ou checklist de entrega.",
      href: `${base}/ordens/qualidade-operacional`,
    });
  }

  const topMotivo = input.rankings.motivos[0];
  if (topMotivo && topMotivo.quantidade && topMotivo.quantidade >= CATEGORIA_RETORNO_MIN) {
    alerts.push({
      id: "categoria-excesso-retornos",
      priority: "medium",
      category: "operacional",
      title: "Motivo recorrente de retorno",
      description: `"${topMotivo.label}" aparece em ${topMotivo.quantidade} retorno(s) no período.`,
      recommendation:
        "Investigue a causa raiz desse motivo e padronize correções preventivas.",
      href: `${base}/ordens/qualidade-operacional`,
    });
  }

  const topServico = input.rankings.servicos[0];
  if (
    topServico &&
    topServico.quantidade &&
    topServico.quantidade >= PRODUTO_GARANTIA_MIN &&
    input.financeiro.pecas_garantia > 0
  ) {
    alerts.push({
      id: "produto-excesso-garantia",
      priority: "medium",
      category: "operacional",
      title: "Serviço com excesso de garantia",
      description: `${topServico.label} com ${topServico.quantidade} retorno(s). Peças em garantia: R$ ${input.financeiro.pecas_garantia.toFixed(2)}.`,
      recommendation:
        "Verifique qualidade do serviço/peça e renegocie com fornecedores se necessário.",
      href: `${base}/ordens/qualidade-operacional`,
    });
  }

  return alerts;
}
