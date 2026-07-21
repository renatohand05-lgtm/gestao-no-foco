import type { CrmFunilStage } from "@/lib/crm/constants";
import type { SortOrder } from "@/types/pagination";

export type { SortOrder, PaginatedResult } from "@/types/pagination";

export type TipoPessoa = "pf" | "pj";

export type ClienteSortField =
  | "nome"
  | "created_at"
  | "documento"
  | "cidade"
  | "ativo";

export type Cliente = {
  id: string;
  tenant_id: string;
  nome: string;
  razao_social: string | null;
  email: string | null;
  telefone: string | null;
  whatsapp: string | null;
  documento: string | null;
  tipo_pessoa: TipoPessoa;
  data_referencia: string | null;
  cep: string | null;
  rua: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  segmento: string | null;
  porte: string | null;
  origem: string | null;
  observacoes: string | null;
  classificacao: string | null;
  score: number;
  consultor_id: string | null;
  estagio_funil: CrmFunilStage;
  ativo: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ClienteListItem = Pick<
  Cliente,
  | "id"
  | "nome"
  | "email"
  | "telefone"
  | "whatsapp"
  | "documento"
  | "tipo_pessoa"
  | "cidade"
  | "estado"
  | "ativo"
  | "created_at"
  | "updated_at"
>;

export type ClienteInput = {
  nome: string;
  razao_social?: string | null;
  email?: string | null;
  telefone?: string | null;
  whatsapp?: string | null;
  documento?: string | null;
  tipo_pessoa: TipoPessoa;
  data_referencia?: string | null;
  cep?: string | null;
  rua?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  segmento?: string | null;
  porte?: string | null;
  origem?: string | null;
  observacoes?: string | null;
  classificacao?: string | null;
  score?: number;
  consultor_id?: string | null;
  estagio_funil?: CrmFunilStage;
  tag_ids?: string[];
  ativo: boolean;
};

export type CreateClienteInput = ClienteInput;
export type UpdateClienteInput = Partial<ClienteInput>;

export type ListClientesParams = {
  page?: number;
  perPage?: number;
  search?: string;
  sort?: ClienteSortField;
  order?: SortOrder;
};

export type ClienteSuccessMessage = "created" | "updated" | "deleted";
