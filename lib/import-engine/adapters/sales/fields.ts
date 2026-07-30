/**
 * Sprint 22.5.1 — Campos-alvo do importador de Vendas (Fase 1).
 * Chaves em inglês, consistentes com a convenção do adapter financeiro.
 */
import type { ImportFieldDef } from "../../types/index.ts";

export const SALES_IMPORT_MODULE = "vendas";
export const SALES_IMPORT_ENTITY = "vendas";

export const SALES_IMPORT_FIELDS: ImportFieldDef[] = [
  { key: "client", label: "Cliente", required: true, type: "string" },
  { key: "product", label: "Produto", required: false, type: "string" },
  { key: "service", label: "Serviço", required: false, type: "string" },
  { key: "quantity", label: "Quantidade", required: false, type: "number" },
  { key: "amount", label: "Valor", required: true, type: "currency" },
  { key: "discount", label: "Desconto", required: false, type: "currency" },
  {
    key: "payment_method",
    label: "Forma de pagamento",
    required: false,
    type: "string",
  },
  { key: "date", label: "Data", required: true, type: "date" },
  { key: "seller", label: "Vendedor", required: false, type: "string" },
  { key: "notes", label: "Observações", required: false, type: "string" },
];
