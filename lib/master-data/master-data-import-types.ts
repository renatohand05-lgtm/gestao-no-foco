/**
 * Tipos para futura importação em massa (Sprint 13.16).
 * Sem processamento de arquivo nesta sprint.
 */

export type MasterImportEntity =
  | "fornecedor"
  | "cliente"
  | "produto"
  | "categoria"
  | "centro_custo";

export type MasterImportFieldDef = {
  key: string;
  label: string;
  required: boolean;
  type: "string" | "number" | "boolean" | "date" | "enum";
  enumValues?: string[];
};

export type MasterImportRowError = {
  row: number;
  field?: string;
  code: "required" | "invalid" | "duplicate" | "foreign_key" | "tenant";
  message: string;
};

export type MasterImportPreview = {
  entity: MasterImportEntity;
  totalRows: number;
  validRows: number;
  errors: MasterImportRowError[];
  duplicates: Array<{ row: number; matchedId: string; matchedOn: string[] }>;
  sample: Record<string, unknown>[];
};

export const MASTER_IMPORT_FIELDS: Record<
  MasterImportEntity,
  MasterImportFieldDef[]
> = {
  fornecedor: [
    { key: "nome", label: "Razão social / nome", required: true, type: "string" },
    { key: "documento", label: "CPF/CNPJ", required: false, type: "string" },
    { key: "email", label: "E-mail", required: false, type: "string" },
    { key: "telefone", label: "Telefone", required: false, type: "string" },
    { key: "cidade", label: "Cidade", required: false, type: "string" },
    { key: "estado", label: "UF", required: false, type: "string" },
  ],
  cliente: [
    { key: "nome", label: "Nome", required: true, type: "string" },
    { key: "documento", label: "CPF/CNPJ", required: false, type: "string" },
    { key: "email", label: "E-mail", required: false, type: "string" },
    { key: "telefone", label: "Telefone", required: false, type: "string" },
    {
      key: "tipo_pessoa",
      label: "Tipo",
      required: true,
      type: "enum",
      enumValues: ["pf", "pj"],
    },
  ],
  produto: [
    { key: "nome", label: "Nome", required: true, type: "string" },
    {
      key: "tipo",
      label: "Tipo",
      required: true,
      type: "enum",
      enumValues: ["produto", "servico"],
    },
    { key: "sku", label: "SKU", required: false, type: "string" },
    { key: "codigo_barras", label: "Código de barras", required: false, type: "string" },
  ],
  categoria: [
    { key: "nome", label: "Nome", required: true, type: "string" },
    {
      key: "tipo",
      label: "Tipo",
      required: true,
      type: "enum",
      enumValues: ["receita", "despesa", "ambos"],
    },
    { key: "dre_linha", label: "Linha DRE", required: false, type: "string" },
    { key: "dre_detalhe", label: "Detalhe DRE", required: false, type: "string" },
  ],
  centro_custo: [
    { key: "codigo", label: "Código", required: true, type: "string" },
    { key: "nome", label: "Nome", required: true, type: "string" },
    { key: "tipo", label: "Tipo", required: false, type: "string" },
  ],
};

export type MasterImportFormat = {
  encoding: "utf-8";
  delimiter: "," | ";";
  hasHeader: true;
  maxRows: 5000;
};
