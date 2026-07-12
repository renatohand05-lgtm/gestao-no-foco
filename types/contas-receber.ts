import type { SortOrder } from "@/types/financeiro";

export type ContaReceberStatus = "aberto" | "recebido" | "vencido" | "cancelado";

export type ContaReceberSortField =
  | "numero"
  | "data_vencimento"
  | "data_emissao"
  | "valor_original"
  | "status"
  | "created_at";

export type ContaReceber = {
  id: string;
  tenant_id: string;
  numero: number;
  cliente_id: string;
  venda_id: string | null;
  forma_pagamento_id: string | null;
  categoria_financeira_id: string | null;
  centro_custo_id: string | null;
  plano_conta_id: string | null;
  conta_bancaria_id: string | null;
  descricao: string;
  grupo_parcelamento_id: string | null;
  parcela_numero: number;
  parcela_total: number;
  status: ContaReceberStatus;
  valor_original: number;
  desconto: number;
  juros: number;
  multa: number;
  valor_recebido: number;
  data_emissao: string;
  data_competencia: string;
  data_vencimento: string;
  data_recebimento: string | null;
  observacoes: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ContaReceberClienteResumo = {
  id: string;
  nome: string;
  documento: string | null;
};

export type ContaReceberVendaResumo = {
  id: string;
  numero: number;
};

export type ContaReceberListItem = Pick<
  ContaReceber,
  | "id"
  | "numero"
  | "descricao"
  | "cliente_id"
  | "venda_id"
  | "status"
  | "valor_original"
  | "desconto"
  | "juros"
  | "multa"
  | "valor_recebido"
  | "data_emissao"
  | "data_vencimento"
  | "data_recebimento"
  | "conta_bancaria_id"
  | "parcela_numero"
  | "parcela_total"
  | "created_at"
> & {
  cliente: ContaReceberClienteResumo;
  venda: ContaReceberVendaResumo | null;
  status_exibicao: ContaReceberStatus;
};

export type ContaReceberDetail = ContaReceber & {
  cliente: ContaReceberClienteResumo;
  venda: ContaReceberVendaResumo | null;
  forma_pagamento?: { id: string; nome: string } | null;
  categoria_financeira?: { id: string; nome: string } | null;
  centro_custo?: { id: string; nome: string; codigo: string } | null;
  plano_conta?: { id: string; nome: string; codigo: string } | null;
  conta_bancaria?: { id: string; nome: string } | null;
  status_exibicao: ContaReceberStatus;
};

export type ContaReceberInput = {
  cliente_id: string;
  venda_id?: string | null;
  forma_pagamento_id?: string | null;
  categoria_financeira_id: string;
  centro_custo_id: string;
  plano_conta_id: string;
  descricao: string;
  valor_original: number;
  desconto?: number;
  juros?: number;
  multa?: number;
  data_emissao: string;
  data_competencia: string;
  data_vencimento: string;
  parcelas?: number;
  observacoes?: string | null;
};

export type CreateContaReceberInput = ContaReceberInput;
export type UpdateContaReceberInput = Partial<ContaReceberInput>;

export type ClassificacaoContaReceberInput = {
  categoria_financeira_id: string;
  centro_custo_id: string;
  plano_conta_id: string;
  data_competencia: string;
};

export type ReceberContaInput = {
  data_recebimento: string;
  valor_recebido: number;
  juros?: number;
  multa?: number;
  desconto?: number;
  conta_bancaria_id: string;
};

export type ListContasReceberParams = {
  page?: number;
  perPage?: number;
  search?: string;
  sort?: ContaReceberSortField;
  order?: SortOrder;
  status?: ContaReceberStatus | "all";
  clienteId?: string;
  vencimentoDe?: string;
  vencimentoAte?: string;
};

export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
};

export type ContasReceberResumo = {
  total_aberto: number;
  total_recebido: number;
  total_vencido: number;
  vencimentos_proximos: number;
  quantidade_aberto: number;
  quantidade_vencido: number;
  quantidade_proximos: number;
};

export type ContaReceberSuccessMessage =
  | "created"
  | "updated"
  | "deleted"
  | "recebido"
  | "cancelado";

export type ClienteOption = {
  id: string;
  nome: string;
  documento: string | null;
};

export type VendaOption = {
  id: string;
  numero: number;
  cliente_id: string;
  total: number;
  status: string;
};

export type FormaPagamentoOption = {
  id: string;
  nome: string;
};

export type CategoriaFinanceiraOption = {
  id: string;
  nome: string;
  tipo: string;
};

export type CentroCustoOption = {
  id: string;
  codigo: string;
  nome: string;
};

export type PlanoContaOption = {
  id: string;
  codigo: string;
  nome: string;
};
