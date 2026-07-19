import type { BusinessKpiExplanation } from "@/lib/business-intelligence/types";

/**
 * Explicações executivas dos KPIs — origem e fatores (sem inventar números).
 */
export function buildBusinessKpiExplanations(): BusinessKpiExplanation[] {
  return [
    {
      key: "receita",
      label: "Receita",
      tooltip: "Receita bruta do período (fonte DRE / painel comercial).",
      explanation:
        "Valor oficial de faturamento acumulado no recorte filtrado.",
      origin: "DRE receita_bruta / realizado do painel comercial",
      factors: ["Vendas faturadas", "Competência do período", "Filtros ativos"],
    },
    {
      key: "meta",
      label: "Meta",
      tooltip: "Meta mensal cadastrada para a competência.",
      explanation: "Objetivo financeiro do mês usado como âncora de ritmo e gap.",
      origin: "Cadastro de metas mensais",
      factors: ["Competência", "Centro de custo (se houver)", "Valor da meta"],
    },
    {
      key: "atingimento",
      label: "Atingimento",
      tooltip: "Meta realizada até o momento comparada à meta mensal.",
      explanation:
        "Percentual do realizado sobre a meta. 100% ou mais indica meta atingida/superada.",
      origin: "realizado ÷ meta",
      factors: ["Realizado", "Valor da meta"],
    },
    {
      key: "projecao",
      label: "Projeção",
      tooltip: "Projeção de fechamento por dias úteis (regra já existente).",
      explanation:
        "Estima o fechamento mantendo o padrão atual de dias úteis restantes.",
      origin: "Camada de projeção de metas (sem recálculo nesta sprint)",
      factors: ["Média útil", "Dias úteis restantes", "Realizado acumulado"],
    },
    {
      key: "gap",
      label: "Gap",
      tooltip: "Quanto falta para a meta (restante).",
      explanation: "Diferença residual entre meta e realizado.",
      origin: "meta − realizado (quando meta existe)",
      factors: ["Meta", "Realizado"],
    },
    {
      key: "necessario",
      label: "Necessário / dia",
      tooltip: "Valor necessário por dia útil restante para fechar a meta.",
      explanation:
        "Distribui o gap restante pelos dias úteis que ainda faltam.",
      origin: "Projeção de metas",
      factors: ["Gap residual", "Dias úteis restantes"],
    },
    {
      key: "ritmo",
      label: "Ritmo",
      tooltip: "Comparação entre ritmo esperado e ritmo atual.",
      explanation:
        "O ritmo esperado segue o tempo útil decorrido; o atual acompanha o atingimento.",
      origin: "ritmo_esperado vs ritmo_atual",
      factors: [
        "Percentual de tempo útil",
        "Percentual de atingimento",
        "Diferença em p.p.",
      ],
    },
    {
      key: "probabilidade",
      label: "Probabilidade",
      tooltip: "Estimativa gerencial de atingir a meta.",
      explanation:
        "Estimativa baseada em ritmo, projeção, tendência e confiança — não é garantia.",
      origin: "Motor de probabilidade comercial existente",
      factors: ["Ritmo", "Projeção", "Tendência", "Confiança / amostra"],
    },
    {
      key: "ticket",
      label: "Ticket médio",
      tooltip: "Total faturado ÷ quantidade de vendas no período.",
      explanation: "Eficiência de receita por venda faturada.",
      origin: "Vendas faturadas do painel",
      factors: ["Total faturado", "Quantidade de vendas", "Comparação anterior"],
    },
    {
      key: "confianca",
      label: "Confiança",
      tooltip: "Qualidade da amostra para interpretar a projeção.",
      explanation:
        "Baixa quando há poucos dias úteis ou poucas vendas; evita conclusões absolutas.",
      origin: "Regras de confiança do painel comercial",
      factors: ["Dias úteis decorridos", "Quantidade de vendas"],
    },
  ];
}
