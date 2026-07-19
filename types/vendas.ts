import type { ProdutoTipo } from "@/types/produtos";
import type { SortOrder, PaginatedResult } from "@/types/pagination";

export type { SortOrder, PaginatedResult };

export type VendaStatus = "orcamento" | "em_andamento" | "faturado" | "cancelado";

export type VendaSortField =
  | "numero"
  | "data_venda"
  | "total"
  | "status"
  | "created_at";

export type VendaItem = {
  id: string;
  tenant_id: string;
  venda_id: string;
  produto_id: string | null;
  descricao: string;
  tipo_item: ProdutoTipo;
  quantidade: number;
  preco_unitario: number;
  desconto: number;
  total: number;
  custo_unitario: number | null;
  margem: number | null;
  ordem: number;
  deleted_at: string | null;
  created_at: string;
};

export type Venda = {
  id: string;
  tenant_id: string;
  numero: number;
  cliente_id: string;
  data_venda: string;
  status: VendaStatus;
  subtotal: number;
  desconto_total: number;
  total: number;
  margem_total: number | null;
  forma_pagamento: string | null;
  forma_pagamento_id: string | null;
  quantidade_parcelas: number;
  categoria_financeira_id: string | null;
  centro_custo_id: string | null;
  observacoes: string | null;
  created_by: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type VendaClienteResumo = {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  documento: string | null;
};

export type VendaProdutoResumo = {
  id: string;
  nome: string;
  sku: string | null;
  tipo: ProdutoTipo;
  unidade_medida: string;
  preco_venda: number | null;
  custo: number | null;
  estoque_atual: number;
};

export type VendaItemWithProduto = VendaItem & {
  produto?: VendaProdutoResumo | null;
};

export type VendaListItem = Pick<
  Venda,
  | "id"
  | "numero"
  | "cliente_id"
  | "data_venda"
  | "status"
  | "total"
  | "created_at"
  | "updated_at"
> & {
  cliente: VendaClienteResumo;
};

export type VendaDetail = Venda & {
  cliente: VendaClienteResumo;
  itens: VendaItemWithProduto[];
  forma_pagamento_ref?: {
    id: string;
    nome: string;
    tipo: string;
    gera_financeiro?: boolean;
    dias_compensacao?: number;
  } | null;
  categoria_financeira_ref?: {
    id: string;
    nome: string;
  } | null;
  centro_custo_ref?: {
    id: string;
    codigo: string;
    nome: string;
  } | null;
  created_by_profile?: {
    full_name: string | null;
    email: string;
  } | null;
};

export type VendaResumoFinanceiro = {
  subtotal: number;
  desconto_itens: number;
  desconto_total: number;
  total_geral: number;
  margem_estimada: number | null;
};

export type VendaOpenViewItem = VendaDetail & {
  resumo: VendaResumoFinanceiro;
  acoes_disponiveis: Array<"editar" | "faturar" | "cancelar" | "excluir">;
};

export type VendasAbertasView = {
  items: VendaOpenViewItem[];
  resumo: {
    quantidade: number;
    subtotal: number;
    desconto_itens: number;
    desconto_total: number;
    total_geral: number;
    margem_estimada: number | null;
    por_status: Record<"orcamento" | "em_andamento", number>;
  };
};

export type VendaItemInput = {
  produto_id: string;
  quantidade: number;
  preco_unitario: number;
  desconto?: number;
};

export type VendaInput = {
  cliente_id: string;
  data_venda: string;
  status?: VendaStatus;
  desconto_total?: number;
  forma_pagamento?: string | null;
  forma_pagamento_id?: string | null;
  quantidade_parcelas?: number;
  categoria_financeira_id?: string | null;
  centro_custo_id?: string | null;
  observacoes?: string | null;
  itens: VendaItemInput[];
};

export type CreateVendaInput = VendaInput;
export type UpdateVendaInput = VendaInput;

export type ListVendasParams = {
  page?: number;
  perPage?: number;
  search?: string;
  sort?: VendaSortField;
  order?: SortOrder;
  status?: VendaStatus | "all";
  clienteId?: string;
  dataDe?: string;
  dataAte?: string;
  centroCustoId?: string;
};

export type VendaSuccessMessage =
  | "created"
  | "updated"
  | "deleted"
  | "faturado"
  | "faturado_recebido"
  | "cancelado";

export type ClienteOption = {
  id: string;
  nome: string;
  documento: string | null;
};

export type ProdutoOption = VendaProdutoResumo;

export type FormaPagamentoOption = {
  id: string;
  nome: string;
  tipo: string;
  ativo: boolean;
};

export type VendaCategoriaFinanceiraOption = {
  id: string;
  nome: string;
};

export type VendaCentroCustoOption = {
  id: string;
  codigo: string;
  nome: string;
};
