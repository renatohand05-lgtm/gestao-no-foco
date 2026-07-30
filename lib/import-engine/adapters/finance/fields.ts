/**
 * Sprint 22.5.1 — Campos-alvo do importador financeiro (movimentações).
 * Movido de `lib/finance/import/finance-import-fields.ts` (Sprint 22.5).
 * `lib/finance/import/finance-import-fields.ts` reexporta este módulo para
 * manter compatibilidade com o código existente.
 */
import type { ImportFieldDef } from "../../types/index.ts";

export const FINANCE_IMPORT_MODULE = "financeiro";
export const FINANCE_IMPORT_ENTITY = "movimentacoes";

export const FINANCE_MOVEMENT_IMPORT_FIELDS: ImportFieldDef[] = [
  {
    key: "description",
    label: "Descrição",
    required: true,
    type: "string",
  },
  {
    key: "amount",
    label: "Valor",
    required: true,
    type: "currency",
  },
  {
    key: "date",
    label: "Data / Competência",
    required: true,
    type: "date",
  },
  {
    key: "bank_account",
    label: "Conta bancária",
    required: false,
    type: "string",
  },
  {
    key: "category",
    label: "Categoria",
    required: false,
    type: "string",
  },
  {
    key: "cost_center",
    label: "Centro de custo",
    required: false,
    type: "string",
  },
  {
    key: "supplier",
    label: "Fornecedor / Contraparte",
    required: false,
    type: "string",
  },
  {
    key: "document",
    label: "Documento",
    required: false,
    type: "string",
  },
  {
    key: "external_id",
    label: "Identificador externo",
    required: false,
    type: "string",
  },
  {
    key: "balance",
    label: "Saldo após lançamento",
    required: false,
    type: "currency",
  },
  {
    key: "kind",
    label: "Tipo (entrada/saída/transferência/tarifa/imposto)",
    required: false,
    type: "enum",
    enumValues: [
      "entrada",
      "saida",
      "credito",
      "debito",
      "crédito",
      "débito",
      "transferencia",
      "tarifa",
      "imposto",
    ],
  },
];
