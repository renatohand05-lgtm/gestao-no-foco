/**
 * Definições canônicas de métricas — Sprint 15.
 * Evitar indicadores com nomes parecidos e fórmulas diferentes.
 */

export const METRICAS_DEFINICOES = {
  osAberta:
    "OS com status operacional não finalizado e não cancelado (exclui entregue, faturado, cancelado).",
  osPendente:
    "OS que aguarda aprovação, peça, cliente, orçamento ou ação interna.",
  osAtrasada:
    "OS não terminal com previsao_entrega < hoje.",
  osSemAtualizacao:
    "OS aberta com updated_at há mais de 48h sem mudança de status.",
  carrosNaOficina:
    "OS abertas com veículo vinculado (status não terminal).",
  vendaValida:
    "Venda com status faturado, deleted_at nulo — base de faturamento e ticket.",
  ticketMedioVendas:
    "Soma do total das vendas válidas ÷ quantidade de vendas válidas.",
  ticketMedioOs:
    "Soma do valor_total das OS faturadas ÷ quantidade de OS faturadas.",
  margemBrutaVendas:
    "Soma de margem_total das vendas faturadas (já considera descontos da venda).",
  taxaAprovacaoOs:
    "OS aprovadas ou parcialmente aprovadas ÷ OS que passaram por aguardando_aprovacao (aprox. por status atual).",
  indiceRetrabalho:
    "OS com status retorno ÷ OS finalizadas no período.",
  retornoGarantia:
    "OS com status garantia ou tipo_abertura relacionado a garantia.",
  estoqueBaixo:
    "Produto ativo com estoque_atual > 0 e estoque_atual ≤ estoque_minimo (quando mínimo > 0).",
  estoqueZerado: "Produto ativo com estoque_atual ≤ 0 (não serviço).",
  semGiro90d:
    "Produto sem movimentação de estoque nos últimos 90 dias.",
  ocupacaoRecurso:
    "Recursos com status ocupado ou reservado ÷ recursos ativos.",
} as const;

export type MetricaKey = keyof typeof METRICAS_DEFINICOES;

/** Status considerados terminal (fora da oficina). */
export const OS_STATUS_TERMINAL = new Set([
  "entregue",
  "faturado",
  "cancelado",
  "cancelada",
]);

/** Status de OS aberta / na oficina. */
export const OS_STATUS_ABERTA = [
  "rascunho",
  "aguardando_diagnostico",
  "diagnostico_concluido",
  "aguardando_orcamento",
  "aguardando_aprovacao",
  "aprovado",
  "parcialmente_aprovado",
  "em_execucao",
  "aguardando_peca",
  "aguardando_cliente",
  "pronto_para_entrega",
  "retorno",
  "garantia",
] as const;

/** Colunas do quadro operacional → status mapeados. */
export const OPERACAO_BOARD_COLUMNS = [
  {
    key: "entrada",
    label: "Entrada",
    statuses: ["rascunho"] as const,
  },
  {
    key: "diagnostico",
    label: "Diagnóstico",
    statuses: ["aguardando_diagnostico", "diagnostico_concluido"] as const,
  },
  {
    key: "orcamento",
    label: "Orçamento",
    statuses: ["aguardando_orcamento"] as const,
  },
  {
    key: "aprovacao",
    label: "Aguardando aprovação",
    statuses: ["aguardando_aprovacao"] as const,
  },
  {
    key: "pecas",
    label: "Aguardando peças",
    statuses: ["aguardando_peca"] as const,
  },
  {
    key: "execucao",
    label: "Em execução",
    statuses: [
      "aprovado",
      "parcialmente_aprovado",
      "em_execucao",
      "aguardando_cliente",
    ] as const,
  },
  {
    key: "pronto",
    label: "Pronto para entrega",
    statuses: ["pronto_para_entrega"] as const,
  },
  {
    key: "finalizado",
    label: "Finalizado",
    statuses: ["entregue", "faturado"] as const,
  },
] as const;

export type OperacaoBoardColumnKey =
  (typeof OPERACAO_BOARD_COLUMNS)[number]["key"];

/** Status alvo padrão ao soltar cartão na coluna. */
export const BOARD_DROP_TARGET_STATUS: Record<OperacaoBoardColumnKey, string> =
  {
    entrada: "rascunho",
    diagnostico: "aguardando_diagnostico",
    orcamento: "aguardando_orcamento",
    aprovacao: "aguardando_aprovacao",
    pecas: "aguardando_peca",
    execucao: "em_execucao",
    pronto: "pronto_para_entrega",
    finalizado: "entregue",
  };
