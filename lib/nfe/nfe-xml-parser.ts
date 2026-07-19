/**
 * Parser seguro de XML de NF-e — Sprint 13.22.
 * Proteção XXE: rejeita DOCTYPE/ENTITY; parser sem resolução de entidades externas.
 */

import { XMLParser } from "fast-xml-parser";
import { createHash } from "node:crypto";

import type {
  NfeDuplicata,
  NfeEmitenteEndereco,
  ParsedNfe,
  ParsedNfeItem,
} from "@/types/nfe-entrada";

export const NFE_XML_MAX_BYTES = 2 * 1024 * 1024; // 2MB
export const NFE_ALLOWED_MIME = new Set([
  "application/xml",
  "text/xml",
  "application/octet-stream",
]);

export class NfeParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NfeParseError";
  }
}

function assertNoXxe(xml: string) {
  const sample = xml.slice(0, 50_000);
  if (/<!DOCTYPE/i.test(sample) || /<!ENTITY/i.test(sample)) {
    throw new NfeParseError(
      "XML rejeitado por conter DOCTYPE/ENTITY (proteção XXE).",
    );
  }
  if (/SYSTEM\s+["']/i.test(sample) || /PUBLIC\s+["']/i.test(sample)) {
    throw new NfeParseError(
      "XML rejeitado por referências externas (proteção XXE).",
    );
  }
}

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function textOf(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string" || typeof value === "number") {
    const s = String(value).trim();
    return s.length ? s : null;
  }
  if (typeof value === "object" && value !== null && "#text" in value) {
    return textOf((value as { "#text"?: unknown })["#text"]);
  }
  return null;
}

function numOf(value: unknown, fallback = 0): number {
  const raw = textOf(value);
  if (!raw) return fallback;
  const n = Number(raw.replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
}

function onlyDigits(value: string | null | undefined): string | null {
  if (!value) return null;
  const d = value.replace(/\D/g, "");
  return d.length ? d : null;
}

function parseDateNfe(raw: string | null): string | null {
  if (!raw) return null;
  // ISO or yyyy-mm-ddThh:mm:ss±tz
  const m = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  return m?.[1] ?? null;
}

function unwrapNfe(root: Record<string, unknown>): {
  root: Record<string, unknown>;
  nfeProc: Record<string, unknown> | undefined;
  nfe: Record<string, unknown> | undefined;
  inf: Record<string, unknown>;
} {
  // nfeProc > NFe > infNFe  OR  NFe > infNFe  OR  infNFe
  const nfeProc = (root.nfeProc ?? root.NfeProc) as
    | Record<string, unknown>
    | undefined;
  const nfe = (nfeProc?.NFe ?? nfeProc?.nfe ?? root.NFe ?? root.nfe) as
    | Record<string, unknown>
    | undefined;
  const inf = (nfe?.infNFe ?? nfe?.infnfe ?? root.infNFe) as
    | Record<string, unknown>
    | undefined;
  if (!inf || typeof inf !== "object") {
    throw new NfeParseError("XML não contém infNFe de NF-e válida.");
  }
  return { root, nfeProc, nfe, inf };
}

function chaveFromInf(inf: Record<string, unknown>, xml: string): string {
  const idAttr =
    textOf(inf["@_Id"]) ||
    textOf(inf["@_id"]) ||
    textOf((inf as { Id?: unknown }).Id);
  if (idAttr) {
    const digits = onlyDigits(idAttr.replace(/^NFe/i, ""));
    if (digits && digits.length === 44) return digits;
  }
  const chNFe = textOf(
    ((inf.protNFe ?? {}) as Record<string, unknown>).chNFe,
  );
  if (chNFe && onlyDigits(chNFe)?.length === 44) return onlyDigits(chNFe)!;

  const m = xml.replace(/\s+/g, "").match(/Id=["']NFe(\d{44})["']/i);
  if (m?.[1]) return m[1];

  throw new NfeParseError("Chave de acesso da NF-e não encontrada ou inválida.");
}

function parseEndereco(ender: unknown): NfeEmitenteEndereco {
  const e = (ender ?? {}) as Record<string, unknown>;
  return {
    logradouro: textOf(e.xLgr),
    numero: textOf(e.nro),
    complemento: textOf(e.xCpl),
    bairro: textOf(e.xBairro),
    municipio: textOf(e.xMun),
    uf: textOf(e.UF),
    cep: onlyDigits(textOf(e.CEP)),
  };
}

function parseItens(inf: Record<string, unknown>): ParsedNfeItem[] {
  const dets = asArray(inf.det as Record<string, unknown> | Record<string, unknown>[]);
  const items: ParsedNfeItem[] = [];

  for (const det of dets) {
    const prod = (det.prod ?? {}) as Record<string, unknown>;
    const nItem = Number(textOf(det["@_nItem"]) ?? textOf(det.nItem) ?? items.length + 1);
    const rastro = asArray(
      prod.rastro as Record<string, unknown> | Record<string, unknown>[] | undefined,
    )[0] as Record<string, unknown> | undefined;
    items.push({
      numero_item: Number.isFinite(nItem) ? nItem : items.length + 1,
      codigo_fornecedor: textOf(prod.cProd),
      ean: onlyDigits(textOf(prod.cEAN) ?? textOf(prod.cEANTrib)),
      descricao: textOf(prod.xProd) || `Item ${nItem}`,
      ncm: textOf(prod.NCM),
      cest: textOf(prod.CEST),
      cfop: textOf(prod.CFOP),
      unidade: textOf(prod.uCom) ?? textOf(prod.uTrib),
      quantidade: numOf(prod.qCom, numOf(prod.qTrib, 0)),
      valor_unitario: numOf(prod.vUnCom, numOf(prod.vUnTrib, 0)),
      valor_total: numOf(prod.vProd, 0),
      valor_desconto: numOf(prod.vDesc, 0),
      lote: textOf(rastro?.nLote) ?? null,
    });
  }

  if (items.length === 0) {
    throw new NfeParseError("NF-e sem itens (det/prod).");
  }
  return items;
}

function parseDuplicatas(inf: Record<string, unknown>): NfeDuplicata[] {
  const cobr = (inf.cobr ?? {}) as Record<string, unknown>;
  const dups = asArray(
    cobr.dup as Record<string, unknown> | Record<string, unknown>[] | undefined,
  );
  return dups.map((d) => ({
    numero: textOf(d.nDup),
    vencimento: parseDateNfe(textOf(d.dVenc)),
    valor: numOf(d.vDup, 0),
  }));
}

export function hashXml(xml: string): string {
  return createHash("sha256").update(xml, "utf8").digest("hex");
}

export function validateXmlUpload(input: {
  filename?: string;
  mimeType?: string | null;
  byteLength: number;
}): void {
  if (input.byteLength <= 0) {
    throw new NfeParseError("Arquivo vazio.");
  }
  if (input.byteLength > NFE_XML_MAX_BYTES) {
    throw new NfeParseError(
      `Arquivo acima do limite de ${Math.round(NFE_XML_MAX_BYTES / 1024 / 1024)}MB.`,
    );
  }
  const name = (input.filename ?? "").toLowerCase();
  const mime = (input.mimeType ?? "").toLowerCase();
  const extOk = name.endsWith(".xml");
  const mimeOk = !mime || NFE_ALLOWED_MIME.has(mime) || mime.includes("xml");
  if (!extOk && !mimeOk) {
    throw new NfeParseError("Aceito apenas arquivo XML de NF-e.");
  }
}

/**
 * Parseia XML de NF-e (modelo 55) de forma segura.
 * Campos opcionais ausentes → null/0.
 */
export function parseNfeXml(xmlRaw: string): ParsedNfe & { xml_hash: string } {
  const xml = xmlRaw.replace(/^\uFEFF/, "").trim();
  if (!xml) throw new NfeParseError("XML vazio.");
  assertNoXxe(xml);

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    removeNSPrefix: true,
    trimValues: true,
    processEntities: false,
    allowBooleanAttributes: true,
  });

  let parsed: Record<string, unknown>;
  try {
    parsed = parser.parse(xml) as Record<string, unknown>;
  } catch {
    throw new NfeParseError("XML malformado — não foi possível interpretar.");
  }

  const { nfeProc, inf } = unwrapNfe(parsed);
  const ide = (inf.ide ?? {}) as Record<string, unknown>;
  const emit = (inf.emit ?? {}) as Record<string, unknown>;
  const totalNode = ((inf.total ?? {}) as Record<string, unknown>).ICMSTot as
    | Record<string, unknown>
    | undefined;
  const prot = (nfeProc?.protNFe ??
    ((nfeProc as Record<string, unknown> | undefined)?.protNFe)) as
    | Record<string, unknown>
    | undefined;
  const infProt = (prot?.infProt ?? {}) as Record<string, unknown>;

  const chave = chaveFromInf(
    { ...inf, protNFe: prot },
    xml,
  );

  const itensBase = parseItens(inf);
  const valorProdutos = numOf(totalNode?.vProd, itensBase.reduce((s, i) => s + i.valor_total, 0));
  const valorFrete = numOf(totalNode?.vFrete, 0);
  const valorSeguro = numOf(totalNode?.vSeg, 0);
  const valorDesc = numOf(totalNode?.vDesc, 0);
  const valorOutro = numOf(totalNode?.vOutro, 0);
  const valorImpostos =
    numOf(totalNode?.vICMS, 0) +
    numOf(totalNode?.vIPI, 0) +
    numOf(totalNode?.vPIS, 0) +
    numOf(totalNode?.vCOFINS, 0);
  const valorTotal = numOf(totalNode?.vNF, valorProdutos);

  const itens: ParsedNfeItem[] = itensBase;

  const pagNode = (inf.pag ?? {}) as Record<string, unknown>;
  const pag = asArray(
    pagNode.detPag as Record<string, unknown> | Record<string, unknown>[] | undefined,
  );
  const formaPagamento = textOf(pag[0]?.tPag) ?? textOf(pagNode.tPag);
  const infAdic = (inf.infAdic ?? {}) as Record<string, unknown>;

  return {
    chave_acesso: chave,
    numero: textOf(ide.nNF),
    serie: textOf(ide.serie),
    modelo: textOf(ide.mod) ?? "55",
    data_emissao: parseDateNfe(textOf(ide.dhEmi) ?? textOf(ide.dEmi)),
    natureza_operacao: textOf(ide.natOp),
    emitente: {
      cnpj_cpf: onlyDigits(textOf(emit.CNPJ) ?? textOf(emit.CPF)),
      razao_social: textOf(emit.xNome),
      nome_fantasia: textOf(emit.xFant),
      ie: textOf(emit.IE),
      endereco: parseEndereco(emit.enderEmit),
    },
    totais: {
      valor_produtos: valorProdutos,
      valor_frete: valorFrete,
      valor_seguro: valorSeguro,
      valor_desconto: valorDesc,
      valor_outras_despesas: valorOutro,
      valor_impostos: valorImpostos,
      valor_total: valorTotal,
    },
    forma_pagamento: formaPagamento,
    duplicatas: parseDuplicatas(inf),
    informacoes_complementares: textOf(infAdic.infCpl),
    protocolo_autorizacao: textOf(infProt.nProt),
    itens,
    xml_hash: hashXml(xml),
  };
}

export function computeItemFinalCost(input: {
  valorTotal: number;
  valorDesconto: number;
  freteRateado: number;
  outrasRateado: number;
  seguroRateado: number;
  quantidade: number;
}): { custoTotal: number; custoUnitario: number } {
  const custoTotal = Number(
    (
      input.valorTotal -
      input.valorDesconto +
      input.freteRateado +
      input.outrasRateado +
      input.seguroRateado
    ).toFixed(2),
  );
  const q = input.quantidade > 0 ? input.quantidade : 1;
  return {
    custoTotal: Math.max(custoTotal, 0),
    custoUnitario: Number((Math.max(custoTotal, 0) / q).toFixed(6)),
  };
}

export function allocateRates(
  itemValorTotal: number,
  totals: {
    frete: number;
    outras: number;
    seguro: number;
    somaItens: number;
  },
) {
  const base = totals.somaItens > 0 ? totals.somaItens : 1;
  return {
    frete: Number(((totals.frete * itemValorTotal) / base).toFixed(2)),
    outras: Number(((totals.outras * itemValorTotal) / base).toFixed(2)),
    seguro: Number(((totals.seguro * itemValorTotal) / base).toFixed(2)),
  };
}
