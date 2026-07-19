import type { SortOrder } from "@/types/pagination";

export type { SortOrder, PaginatedResult } from "@/types/pagination";

export type TipoPessoa = "pf" | "pj";

export type FornecedorFrequencia =
  | "mensal"
  | "bimestral"
  | "trimestral"
  | "semestral"
  | "anual"
  | "semanal";

export type FornecedorSortField =
  | "nome"
  | "documento"
  | "cidade"
  | "ativo"
  | "created_at";

export type Fornecedor = {
  id: string;
  tenant_id: string;
  nome: string;
  nome_fantasia: string | null;
  tipo_pessoa: TipoPessoa | null;
  documento: string | null;
  email: string | null;
  telefone: string | null;
  cep: string | null;
  rua: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  categoria_financeira_id: string | null;
  plano_conta_id: string | null;
  centro_custo_id: string | null;
  forma_pagamento_id: string | null;
  conta_bancaria_id: string | null;
  prazo_medio_dias: number | null;
  recorrente: boolean;
  frequencia: FornecedorFrequencia | null;
  observacoes: string | null;
  ativo: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type FornecedorListItem = Pick<
  Fornecedor,
  | "id"
  | "nome"
  | "nome_fantasia"
  | "documento"
  | "email"
  | "telefone"
  | "cidade"
  | "estado"
  | "ativo"
  | "recorrente"
  | "created_at"
>;

export type FornecedorDetail = Fornecedor & {
  categoria_financeira?: {
    id: string;
    nome: string;
    dre_linha: string | null;
    dre_detalhe: string | null;
  } | null;
  plano_conta?: {
    id: string;
    codigo: string;
    nome: string;
    dre_linha: string | null;
    dre_detalhe: string | null;
  } | null;
  centro_custo?: { id: string; codigo: string; nome: string } | null;
  forma_pagamento?: { id: string; nome: string } | null;
  conta_bancaria?: { id: string; nome: string } | null;
};

export type FornecedorInput = {
  nome: string;
  nome_fantasia?: string | null;
  tipo_pessoa?: TipoPessoa | null;
  documento?: string | null;
  email?: string | null;
  telefone?: string | null;
  cep?: string | null;
  rua?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  categoria_financeira_id?: string | null;
  plano_conta_id?: string | null;
  centro_custo_id?: string | null;
  forma_pagamento_id?: string | null;
  conta_bancaria_id?: string | null;
  prazo_medio_dias?: number | null;
  recorrente?: boolean;
  frequencia?: FornecedorFrequencia | null;
  observacoes?: string | null;
  ativo: boolean;
};

export type CreateFornecedorInput = FornecedorInput;
export type UpdateFornecedorInput = Partial<FornecedorInput>;

export type ListFornecedoresParams = {
  page?: number;
  perPage?: number;
  search?: string;
  sort?: FornecedorSortField;
  order?: SortOrder;
  ativo?: boolean | "all";
};

export type FornecedorSuccessMessage = "created" | "updated" | "deleted";
