export type ProdutoTipo =
  | "produto"
  | "servico"
  | "kit"
  | "combo"
  | "materia_prima";

export type ProdutoSortField =
  | "nome"
  | "created_at"
  | "preco_venda"
  | "estoque_atual"
  | "tipo"
  | "ativo";

export type SortOrder = "asc" | "desc";

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
};

export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
};

export type ProdutoSuccessMessage = "created" | "updated" | "deleted";
