import type { MovimentacaoBancariaTipo } from "@/types/movimentacoes-bancarias";

export type FluxoCaixaStatusFilter = "all" | "realizado" | "previsto";

export type FluxoCaixaFilterOption = {
  id: string;
  nome: string;
};

export type FluxoCaixaFilters = {
  dataDe: string;
  dataAte: string;
  contaBancariaId?: string;
  categoriaId?: string;
  centroCustoId?: string;
  status?: FluxoCaixaStatusFilter;
};

export type FluxoCaixaResumo = {
  saldo_inicial: number;
  entradas_previstas: number;
  saidas_previstas: number;
  entradas_realizadas: number;
  saidas_realizadas: number;
  /** Saldo líquido do último dia do período. */
  saldo_diario: number;
  /** Saldo acumulado ao fim do período. */
  saldo_acumulado: number;
  saldo_projetado: number;
  /** Saldo operacional consolidado das contas ativas (filtro de conta). */
  saldo_atual: number;
};

export type FluxoCaixaDailyPoint = {
  data: string;
  entradas: number;
  saidas: number;
  entradas_realizadas: number;
  saidas_realizadas: number;
  entradas_previstas: number;
  saidas_previstas: number;
  saldo_diario: number;
  saldo_acumulado: number;
};

export type FluxoCaixaLancamentoNatureza = "realizado" | "previsto";
export type FluxoCaixaLancamentoDirecao = "entrada" | "saida";

export type FluxoCaixaLancamento = {
  id: string;
  data: string;
  descricao: string;
  natureza: FluxoCaixaLancamentoNatureza;
  direcao: FluxoCaixaLancamentoDirecao;
  /** Tipo bancário quando natureza = realizado; null para previstos. */
  tipo: MovimentacaoBancariaTipo | null;
  valor: number;
  saldo_novo: number | null;
  conta_bancaria_id: string | null;
  conta_bancaria_nome: string | null;
  categoria_id: string | null;
  categoria_nome: string | null;
  centro_custo_id: string | null;
  centro_custo_nome: string | null;
  origem_titulo: "movimentacao" | "conta_receber" | "conta_pagar";
};

export type FluxoCaixaContaSaldo = {
  id: string;
  nome: string;
  tipo: string;
  saldo_inicial: number;
  saldo_atual: number;
  ativo: boolean;
};

export type FluxoCaixaFilterOptions = {
  contas: FluxoCaixaFilterOption[];
  categorias: FluxoCaixaFilterOption[];
  centrosCusto: FluxoCaixaFilterOption[];
};

export type FluxoCaixaResult = {
  resumo: FluxoCaixaResumo;
  daily: FluxoCaixaDailyPoint[];
  itens: FluxoCaixaLancamento[];
  filterOptions: FluxoCaixaFilterOptions;
};
