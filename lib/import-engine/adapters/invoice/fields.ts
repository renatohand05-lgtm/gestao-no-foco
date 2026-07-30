/**
 * Sprint 25.3 — Campos-alvo conciliação / preview de NF-e via Import Engine.
 * Persistência real permanece em `lib/nfe` (NfeEntradaService) — sem segunda engine.
 */
import type { ImportFieldDef } from "../../types/index.ts";

export const INVOICE_IMPORT_MODULE = "notas_fiscais";
export const INVOICE_IMPORT_ENTITY = "nfe_entrada";

export const INVOICE_IMPORT_FIELDS: ImportFieldDef[] = [
  { key: "chave_acesso", label: "Chave de acesso", required: true, type: "string" },
  { key: "numero", label: "Número", required: false, type: "string" },
  { key: "serie", label: "Série", required: false, type: "string" },
  { key: "emissao", label: "Emissão", required: false, type: "date" },
  { key: "fornecedor", label: "Fornecedor", required: false, type: "string" },
  { key: "cnpj", label: "CNPJ", required: false, type: "string" },
  { key: "codigo_produto", label: "Código produto", required: false, type: "string" },
  { key: "ean", label: "EAN", required: false, type: "string" },
  { key: "descricao", label: "Descrição", required: true, type: "string" },
  { key: "ncm", label: "NCM", required: false, type: "string" },
  { key: "cest", label: "CEST", required: false, type: "string" },
  { key: "cfop", label: "CFOP", required: false, type: "string" },
  { key: "unidade", label: "Unidade", required: false, type: "string" },
  { key: "quantidade", label: "Quantidade", required: true, type: "number" },
  { key: "valor_unitario", label: "Valor unitário", required: false, type: "currency" },
  { key: "desconto", label: "Desconto", required: false, type: "currency" },
  { key: "frete", label: "Frete", required: false, type: "currency" },
  { key: "imposto", label: "Imposto", required: false, type: "currency" },
  { key: "valor_total", label: "Valor total", required: false, type: "currency" },
  { key: "lote", label: "Lote", required: false, type: "string" },
  { key: "validade", label: "Validade", required: false, type: "date" },
];
