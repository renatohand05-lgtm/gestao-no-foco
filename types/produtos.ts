import type { SortOrder, PaginatedResult } from "@/types/pagination";

export type { SortOrder, PaginatedResult };

export type ProdutoTipo =
  | "produto"
  | "servico"
  | "kit"
  | "combo"
  | "materia_prima"
  | "peca"
  | "composto"
  | "ativo_consumo";

export type ProdutoSortField =
  | "nome"
  | "created_at"
  | "preco_venda"
  | "estoque_atual"
  | "tipo"
  | "ativo"
  | "custo"
  | "preco_sugerido"
  | "categoria";

export type Produto = {
  id: string;
  tenant_id: string;
  nome: string;
  tipo: ProdutoTipo;
  codigo_interno: string | null;
  sku: string | null;
  codigo_barras: string | null;
  categoria: string | null;
  subcategoria: string | null;
  marca: string | null;
  unidade_medida: string;
  custo: number | null;
  preco_venda: number | null;
  margem_percent: number | null;
  estoque_atual: number;
  estoque_minimo: number | null;
  estoque_maximo: number | null;
  localizacao: string | null;
  fornecedor_principal: string | null;
  observacoes: string | null;
  ativo: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  /** Enterprise — migration 20260813 */
  descricao_resumida: string | null;
  fabricante: string | null;
  ncm: string | null;
  cest: string | null;
  origem_mercadoria: string | null;
  peso_kg: number | null;
  dimensoes: string | null;
  altura_cm: number | null;
  largura_cm: number | null;
  comprimento_cm: number | null;
  custo_reposicao: number | null;
  preco_minimo: number | null;
  margem_alvo: number | null;
  estoque_seguranca: number | null;
  fornecedor_alternativo: string | null;
  fornecedor_principal_id: string | null;
  fornecedor_alternativo_id: string | null;
  empresa_id: string | null;
  filial_id: string | null;
  controla_estoque: boolean;
  controla_lote: boolean;
  controla_serie: boolean;
  controla_validade: boolean;
  /** Sprint 27.8 — campos de serviço (migration 20260801) */
  tempo_estimado_minutos: number | null;
  preco_sugerido: number | null;
  especialidade: string | null;
  equipe_ou_profissional: string | null;
  unidade_cobranca: string | null;
};

export type ProdutoListItem = Pick<
  Produto,
  | "id"
  | "nome"
  | "tipo"
  | "codigo_interno"
  | "sku"
  | "categoria"
  | "marca"
  | "unidade_medida"
  | "preco_venda"
  | "estoque_atual"
  | "ativo"
  | "created_at"
  | "updated_at"
  | "custo"
  | "preco_sugerido"
  | "tempo_estimado_minutos"
  | "unidade_cobranca"
>;

export type ProdutoInput = {
  nome: string;
  tipo: ProdutoTipo;
  codigo_interno?: string | null;
  sku?: string | null;
  codigo_barras?: string | null;
  categoria?: string | null;
  subcategoria?: string | null;
  marca?: string | null;
  unidade_medida: string;
  custo?: number | null;
  preco_venda?: number | null;
  margem_percent?: number | null;
  estoque_atual?: number;
  estoque_minimo?: number | null;
  estoque_maximo?: number | null;
  localizacao?: string | null;
  fornecedor_principal?: string | null;
  observacoes?: string | null;
  ativo: boolean;
  descricao_resumida?: string | null;
  fabricante?: string | null;
  ncm?: string | null;
  cest?: string | null;
  origem_mercadoria?: string | null;
  peso_kg?: number | null;
  dimensoes?: string | null;
  altura_cm?: number | null;
  largura_cm?: number | null;
  comprimento_cm?: number | null;
  custo_reposicao?: number | null;
  preco_minimo?: number | null;
  margem_alvo?: number | null;
  estoque_seguranca?: number | null;
  fornecedor_alternativo?: string | null;
  fornecedor_principal_id?: string | null;
  fornecedor_alternativo_id?: string | null;
  empresa_id?: string | null;
  filial_id?: string | null;
  controla_estoque?: boolean;
  controla_lote?: boolean;
  controla_serie?: boolean;
  controla_validade?: boolean;
  /** Sprint 27.8 — campos de serviço */
  tempo_estimado_minutos?: number | null;
  preco_sugerido?: number | null;
  especialidade?: string | null;
  equipe_ou_profissional?: string | null;
  unidade_cobranca?: string | null;
};

export type CreateProdutoInput = ProdutoInput;
export type UpdateProdutoInput = Partial<ProdutoInput>;

export type ListProdutosParams = {
  page?: number;
  perPage?: number;
  search?: string;
  sort?: ProdutoSortField;
  order?: SortOrder;
  tipo?: ProdutoTipo | "all";
  ativo?: boolean | "all";
  categoria?: string;
  /** Sprint 27.8.2 — filtros comerciais de serviço */
  custoZerado?: boolean;
  precoZerado?: boolean;
};

export type ProdutoSuccessMessage = "created" | "updated" | "deleted";
