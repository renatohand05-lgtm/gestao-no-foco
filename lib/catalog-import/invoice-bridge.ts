/**
 * Sprint 25.3 — Ponte NF-e ↔ Import Engine (histórico / preview / idempotência).
 * Persistência canônica permanece em `lib/nfe` — sem segunda engine.
 */

import {
  NfeParseError,
  parseNfeXml,
  validateXmlUpload,
} from "../nfe/nfe-xml-parser.ts";
import type { ParsedNfe } from "../../types/nfe-entrada.ts";

export type InvoiceMatchStatus =
  | "vinculado"
  | "sugestao"
  | "nao_encontrado"
  | "duplicado"
  | "exige_revisao";

export type InvoiceItemMatchPreview = {
  line: number;
  descricao: string;
  ean: string | null;
  codigo: string | null;
  quantidade: number;
  valorUnitario: number;
  status: InvoiceMatchStatus;
  confidence: number;
  suggestedProductId: string | null;
};

export function parseInvoiceXmlSafe(input: {
  fileName: string;
  mimeType?: string | null;
  bytes: Uint8Array;
}): ParsedNfe & { xml_hash: string } {
  validateXmlUpload({
    filename: input.fileName,
    mimeType: input.mimeType ?? null,
    byteLength: input.bytes.byteLength,
  });
  const text = new TextDecoder("utf-8").decode(input.bytes);
  try {
    return parseNfeXml(text);
  } catch (err) {
    if (err instanceof NfeParseError) throw err;
    throw new NfeParseError(
      err instanceof Error ? err.message : "XML de NF-e inválido.",
    );
  }
}

export function buildInvoiceItemRows(parsed: ParsedNfe) {
  return parsed.itens.map((item) => ({
    chave_acesso: parsed.chave_acesso,
    numero: parsed.numero,
    serie: parsed.serie,
    emissao: parsed.data_emissao,
    fornecedor: parsed.emitente.razao_social,
    cnpj: parsed.emitente.cnpj_cpf,
    codigo_produto: item.codigo_fornecedor,
    ean: item.ean,
    descricao: item.descricao,
    ncm: item.ncm,
    cest: item.cest,
    cfop: item.cfop,
    unidade: item.unidade,
    quantidade: item.quantidade,
    valor_unitario: item.valor_unitario,
    desconto: item.valor_desconto,
    frete: 0,
    imposto: 0,
    valor_total: item.valor_total,
    lote: item.lote,
    validade: null as string | null,
  }));
}

export function resolveInvoiceItemMatch(input: {
  ean: string | null;
  codigo: string | null;
  descricao: string;
  byEan: Map<string, string>;
  bySku: Map<string, string>;
  bySupplierCode: Map<string, string>;
  byName: Map<string, string>;
}): Omit<
  InvoiceItemMatchPreview,
  "line" | "quantidade" | "valorUnitario"
> & { suggestedProductId: string | null } {
  const ean = input.ean?.trim() || null;
  const codigo = input.codigo?.trim() || null;
  if (ean && input.byEan.has(ean)) {
    return {
      descricao: input.descricao,
      ean,
      codigo,
      status: "vinculado",
      confidence: 0.98,
      suggestedProductId: input.byEan.get(ean) ?? null,
    };
  }
  if (codigo && input.bySupplierCode.has(codigo)) {
    return {
      descricao: input.descricao,
      ean,
      codigo,
      status: "vinculado",
      confidence: 0.9,
      suggestedProductId: input.bySupplierCode.get(codigo) ?? null,
    };
  }
  if (codigo && input.bySku.has(codigo)) {
    return {
      descricao: input.descricao,
      ean,
      codigo,
      status: "sugestao",
      confidence: 0.75,
      suggestedProductId: input.bySku.get(codigo) ?? null,
    };
  }
  const norm = input.descricao
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  if (norm && input.byName.has(norm)) {
    return {
      descricao: input.descricao,
      ean,
      codigo,
      status: "sugestao",
      confidence: 0.55,
      suggestedProductId: input.byName.get(norm) ?? null,
    };
  }
  return {
    descricao: input.descricao,
    ean,
    codigo,
    status: "nao_encontrado",
    confidence: 0.2,
    suggestedProductId: null,
  };
}

/** Baixa confiança nunca cria produto automaticamente. */
export function canAutoCreateProductFromInvoice(confidence: number): boolean {
  return confidence >= 0.85;
}

export { NfeParseError };
