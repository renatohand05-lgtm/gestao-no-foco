import type { SortOrder, PaginatedResult } from "@/types/pagination";

export type { SortOrder, PaginatedResult };

export type MovimentacaoTipo = "entrada" | "saida" | "ajuste";

export type MovimentacaoSortField =
  | "created_at"
  | "tipo"
  | "quantidade"
  | "quantidade_nova";

export type EstoqueMovimentacao = {
  id: string;
  tenant_id: string;
  produto_id: string;
  tipo: MovimentacaoTipo;
  quantidade: number;
  quantidade_anterior: number;
  quantidade_nova: number;
  motivo: string | null;
  origem: string;
  observacoes: string | null;
  created_by: string | null;
  deleted_at: string | null;
  created_at: string;
};

export type EstoqueMovimentacaoProduto = {
  id: string;
  nome: string;
  sku: string | null;
  unidade_medida: string;
  estoque_minimo: number | null;
};

export type EstoqueMovimentacaoListItem = EstoqueMovimentacao & {
  produto: EstoqueMovimentacaoProduto | null;
};

export type EstoqueMovimentacaoDetail = EstoqueMovimentacaoListItem & {
  created_by_profile: {
    full_name: string | null;
    email: string;
  } | null;
};

export type EstoqueProdutoResumo = {
  id: string;
  nome: string;
  sku: string | null;
  unidade_medida: string;
  estoque_atual: number;
  estoque_minimo: number | null;
  estoque_maximo: number | null;
  categoria: string | null;
};

export type CreateMovimentacaoInput = {
  produto_id: string;
  tipo: MovimentacaoTipo;
  quantidade: number;
  motivo?: string | null;
  origem: string;
  observacoes?: string | null;
  /**
   * Quando tipo=entrada e informado: atualiza produtos.custo pelo médio ponderado
   * (política NF-e / compras). Não usar em saídas.
   */
  custo_unitario_entrada?: number | null;
};

export type ListMovimentacoesParams = {
  page?: number;
  perPage?: number;
  search?: string;
  sort?: MovimentacaoSortField;
  order?: SortOrder;
  tipo?: MovimentacaoTipo | "all";
  origem?: string;
  produtoId?: string;
};

export type ListEstoqueProdutosParams = {
  page?: number;
  perPage?: number;
  search?: string;
  alerta?: boolean;
};

export type EstoqueSuccessMessage = "created" | "deleted";
