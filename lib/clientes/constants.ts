export const CLIENTES_DEFAULT_PER_PAGE = 10;
export const CLIENTES_MAX_PER_PAGE = 50;

export const TIPO_PESSOA_OPTIONS = [
  { value: "pf", label: "Pessoa física" },
  { value: "pj", label: "Pessoa jurídica" },
] as const;

export const CLIENTE_STATUS_OPTIONS = [
  { value: true, label: "Ativo" },
  { value: false, label: "Inativo" },
] as const;

export const CLIENTE_SORT_OPTIONS = [
  { value: "nome", label: "Nome" },
  { value: "created_at", label: "Cadastro" },
  { value: "documento", label: "Documento" },
  { value: "cidade", label: "Cidade" },
  { value: "ativo", label: "Status" },
] as const;

export const UF_OPTIONS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

export const CLIENTE_SUCCESS_MESSAGES = {
  created: "Cliente cadastrado com sucesso.",
  updated: "Cliente atualizado com sucesso.",
  deleted: "Cliente excluído com sucesso.",
} as const;
