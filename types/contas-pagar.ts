import type { SortOrder } from "@/types/financeiro";

export type ContaPagarStatus =
  | "aberto"
  | "pago"
  | "vencido"
  | "cancelado"
  | "parcial";

export type ContaPagarStatusPersistido = Exclude<
  ContaPagarStatus,
  "vencido"
>;

export type ContaPagarSortField =
  | "numero"
  | "data_vencimento"
  | "data_emissao"
  | "data_competencia"
  | "valor_original"
  | "status"
  | "created_at";

export type ContaPagar = {
  id: string;
  tenant_id: string;
  numero: number;
  fornecedor_id: string | null;
  fornecedor_nome: string | null;
  forma_pagamento_id: string | null;
  categoria_financeira_id: string | null;
  centro_custo_id: string | null;
  plano_conta_id: string | null;
  conta_bancaria_id: string | null;
  descricao: string;
  grupo_parcelamento_id: string | null;
  parcela_numero: number;
  parcela_total: number;
  status: ContaPagarStatusPersistido;
  valor_original: number;
  desconto: number;
  juros: number;
  multa: number;
  valor_pago: number;
  data_emissao: string;
  data_competencia: string;
  data_vencimento: string;
  data_pagamento: string | null;
  observacoes: string | null;
  anexos_metadata: unknown;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ContaPagarFornecedorResumo = {
  id: string;
  nome: string;
  documento: string | null;
};

export type ContaPagarListItem = Pick<
  ContaPagar,
  | "id"
  | "numero"
  | "descricao"
  | "fornecedor_id"
  | "fornecedor_nome"
  | "status"
  | "valor_original"
  | "desconto"
  | "juros"
  | "multa"
  | "valor_pago"
  | "data_emissao"
  | "data_competencia"
  | "data_vencimento"
  | "data_pagamento"
  | "parcela_numero"
  | "parcela_total"
  | "created_at"
> & {
  fornecedor: ContaPagarFornecedorResumo | null;
  status_exibicao: ContaPagarStatus;
};

export type ContaPagarDetail = ContaPagar & {
  fornecedor: ContaPagarFornecedorResumo | null;
  forma_pagamento?: { id: string; nome: string } | null;
  categoria_financeira?: { id: string; nome: string } | null;
  centro_custo?: { id: string; nome: string; codigo: string } | null;
  plano_conta?: { id: string; nome: string; codigo: string } | null;
  conta_bancaria?: { id: string; nome: string } | null;
  status_exibicao: ContaPagarStatus;
};

export type ContaPagarInput = {
  fornecedor_id?: string | null;
  fornecedor_nome?: string | null;
  forma_pagamento_id?: string | null;
  categoria_financeira_id?: string | null;
  centro_custo_id?: string | null;
  plano_conta_id?: string | null;
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

export type CreateContaPagarInput = ContaPagarInput;
export type UpdateContaPagarInput = Partial<ContaPagarInput>;

export type PagarContaInput = {
  data_pagamento: string;
  valor_pagamento?: number;
  desconto?: number;
  juros?: number;
  multa?: number;
  forma_pagamento_id?: string | null;
  conta_bancaria_id?: string | null;
};

export type ListContasPagarParams = {
  page?: number;
  perPage?: number;
  search?: string;
  sort?: ContaPagarSortField;
  order?: SortOrder;
  status?: ContaPagarStatus | "all";
  fornecedorId?: string;
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

export type ContasPagarResumo = {
  total_aberto: number;
  total_pago: number;
  total_vencido: number;
  vencendo_hoje: number;
  proximos_7_dias: number;
  proximos_30_dias: number;
  quantidade_aberto: number;
  quantidade_vencido: number;
  quantidade_vencendo_hoje: number;
  quantidade_proximos_7: number;
  quantidade_proximos_30: number;
};

export type ContaPagarSuccessMessage =
  | "created"
  | "updated"
  | "deleted"
  | "pago"
  | "cancelado";

export type FornecedorOption = {
  id: string;
  nome: string;
  documento: string | null;
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

export type ContaBancariaOption = {
  id: string;
  nome: string;
};
