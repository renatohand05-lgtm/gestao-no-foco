import { calcVariation } from "@/lib/dashboard/period";
import type { QualidadeOperacionalData } from "@/types/qualidade-operacional";
import { RETORNO_SERVICOS_META_PCT } from "@/types/qualidade-operacional";

export function emptyQualidadeOperacionalData(): QualidadeOperacionalData {
  const { variationPct, trend } = calcVariation(0, 0);

  return {
    kpi: {
      taxaRetornoPct: 0,
      quantidadeRetornos: 0,
      totalServicosConcluidos: 0,
      metaPct: RETORNO_SERVICOS_META_PCT,
      statusCor: "verde",
      comparison: {
        current: 0,
        previous: 0,
        variationPct,
        trend,
      },
    },
    financeiro: {
      receita_perdida: 0,
      pecas_garantia: 0,
      horas_mao_obra: 0,
      custo_total: 0,
    },
    rankings: {
      mecanicos: [],
      motivos: [],
      servicos: [],
    },
    evolucaoMensal: [],
    drillDown: [],
    hasData: false,
  };
}
