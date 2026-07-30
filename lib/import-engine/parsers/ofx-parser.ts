/**
 * Sprint 22.8 — Parser OFX 1.x (SGML) e OFX 2.x (XML).
 * Mapeia transações para linhas compatíveis com bank_statement_lines.
 */
import type { ImportColumn, ImportParseResult, ImportRawRow } from "../types/index.ts";
import { normalizeText } from "./normalize.ts";
import { parseFinanceXmlSafe } from "./xml-finance-parser.ts";

export type OfxTransaction = {
  fitid: string;
  date: string;
  amount: number;
  type: string;
  description: string;
  memo?: string;
  checkNum?: string;
};

export type OfxParseMeta = {
  bankId: string | null;
  accountId: string | null;
  accountType: string | null;
  currency: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  balance: number | null;
  duplicateFitids: string[];
};

const OFX_COLUMNS: ImportColumn[] = [
  { key: "fitid", label: "FITID", index: 0, sampleValues: [] },
  { key: "date", label: "Data", index: 1, sampleValues: [] },
  { key: "amount", label: "Valor", index: 2, sampleValues: [] },
  { key: "type", label: "Tipo", index: 3, sampleValues: [] },
  { key: "description", label: "Descrição", index: 4, sampleValues: [] },
  { key: "bank_id", label: "Banco", index: 5, sampleValues: [] },
  { key: "account_id", label: "Conta", index: 6, sampleValues: [] },
  { key: "period_start", label: "Início período", index: 7, sampleValues: [] },
  { key: "period_end", label: "Fim período", index: 8, sampleValues: [] },
  { key: "balance", label: "Saldo", index: 9, sampleValues: [] },
];

function toBuffer(bytes: Buffer | ArrayBuffer | Uint8Array): Buffer {
  if (Buffer.isBuffer(bytes)) return bytes;
  return Buffer.from(bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : bytes);
}

function normalizeOfxDate(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length !== 8) return raw.trim();
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

function parseOfxAmount(raw: string): number {
  const n = Number.parseFloat(raw.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

/** Extrai valor de tag SGML OFX 1.x (case-insensitive, fechamento opcional). */
function sgmlTag(text: string, tag: string): string | null {
  const openRe = new RegExp(`<${tag}>([^<\\r\\n]+)`, "i");
  const m = text.match(openRe);
  return m ? m[1].trim() : null;
}

function extractSgmlBlocks(text: string, blockTag: string): string[] {
  const openTag = new RegExp(`<${blockTag}>`, "gi");
  const parts = text.split(openTag);
  if (parts.length <= 1) return [];

  const blocks: string[] = [];
  for (let i = 1; i < parts.length; i++) {
    const chunk = parts[i];
    const nextOpen = chunk.search(new RegExp(`<${blockTag}>`, "i"));
    const closeTag = chunk.search(new RegExp(`</${blockTag}>`, "i"));
    let end = chunk.length;
    if (nextOpen >= 0) end = Math.min(end, nextOpen);
    if (closeTag >= 0) end = Math.min(end, closeTag);
    blocks.push(chunk.slice(0, end));
  }
  return blocks;
}

function parseSgmlTransaction(block: string): OfxTransaction | null {
  const fitid = sgmlTag(block, "FITID") ?? sgmlTag(block, "REFNUM");
  const date =
    sgmlTag(block, "DTPOSTED") ??
    sgmlTag(block, "DTUSER") ??
    sgmlTag(block, "DTAVAIL");
  const amountRaw = sgmlTag(block, "TRNAMT");
  if (!fitid || !date || amountRaw == null) return null;

  const name = sgmlTag(block, "NAME") ?? "";
  const memo = sgmlTag(block, "MEMO") ?? "";
  const description = [name, memo].filter(Boolean).join(" — ") || fitid;

  return {
    fitid,
    date: normalizeOfxDate(date),
    amount: parseOfxAmount(amountRaw),
    type: (sgmlTag(block, "TRNTYPE") ?? "OTHER").toUpperCase(),
    description,
    memo: memo || undefined,
    checkNum: sgmlTag(block, "CHECKNUM") ?? undefined,
  };
}

function parseSgmlOfx(text: string): { meta: OfxParseMeta; transactions: OfxTransaction[] } {
  const stmtBlocks = extractSgmlBlocks(text, "STMTRS");
  const stmtBlock = stmtBlocks[0] ?? text;

  const bankId = sgmlTag(stmtBlock, "BANKID") ?? sgmlTag(text, "BANKID");
  const accountId = sgmlTag(stmtBlock, "ACCTID") ?? sgmlTag(text, "ACCTID");
  const accountType = sgmlTag(stmtBlock, "ACCTTYPE") ?? sgmlTag(text, "ACCTTYPE");
  const currency = sgmlTag(stmtBlock, "CURDEF") ?? sgmlTag(text, "CURDEF");
  const periodStart = sgmlTag(text, "DTSTART");
  const periodEnd = sgmlTag(text, "DTEND");
  const balAmt = sgmlTag(stmtBlock, "BALAMT") ?? sgmlTag(text, "BALAMT");

  const txnBlocks = extractSgmlBlocks(text, "STMTTRN");
  const transactions = txnBlocks
    .map(parseSgmlTransaction)
    .filter((t): t is OfxTransaction => t != null);

  return {
    meta: {
      bankId,
      accountId,
      accountType,
      currency,
      periodStart: periodStart ? normalizeOfxDate(periodStart) : null,
      periodEnd: periodEnd ? normalizeOfxDate(periodEnd) : null,
      balance: balAmt != null ? parseOfxAmount(balAmt) : null,
      duplicateFitids: [],
    },
    transactions,
  };
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function readXmlText(node: unknown): string | null {
  if (node == null) return null;
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (typeof node === "object" && node !== null && "#text" in node) {
    return String((node as Record<string, unknown>)["#text"]);
  }
  return null;
}

function parseXmlOfx(text: string): { meta: OfxParseMeta; transactions: OfxTransaction[] } {
  const parsed = parseFinanceXmlSafe(text, { rootHint: "ofx" });
  const root = parsed.root as Record<string, unknown>;
  const bankMsgs = root.BANKMSGSRSV1 ?? root.CREDITCARDMSGSRSV1 ?? root;
  const stmtTrnRs = asArray(
    (bankMsgs as Record<string, unknown>)?.STMTTRNRS ??
      (bankMsgs as Record<string, unknown>)?.CCSTMTTRNRS,
  )[0] as Record<string, unknown> | undefined;

  const stmtrs = (stmtTrnRs?.STMTRS ?? stmtTrnRs?.CCSTMTRS) as Record<string, unknown> | undefined;
  const bankAcctFrom = stmtrs?.BANKACCTFROM as Record<string, unknown> | undefined;
  const ledgerBal = stmtrs?.LEDGERBAL as Record<string, unknown> | undefined;

  const bankId = readXmlText(bankAcctFrom?.BANKID);
  const accountId = readXmlText(bankAcctFrom?.ACCTID);
  const accountType = readXmlText(bankAcctFrom?.ACCTTYPE);
  const currency = readXmlText(stmtrs?.CURDEF);
  const balanceRaw = readXmlText(ledgerBal?.BALAMT);

  const txnList = asArray(
    (stmtrs?.BANKTRANLIST as Record<string, unknown> | undefined)?.STMTTRN,
  );

  const transactions: OfxTransaction[] = [];
  for (const txn of txnList) {
    const t = txn as Record<string, unknown>;
    const fitid = readXmlText(t.FITID) ?? readXmlText(t.REFNUM);
    const date = readXmlText(t.DTPOSTED) ?? readXmlText(t.DTUSER);
    const amountRaw = readXmlText(t.TRNAMT);
    if (!fitid || !date || amountRaw == null) continue;
    const name = readXmlText(t.NAME) ?? "";
    const memo = readXmlText(t.MEMO) ?? "";
    transactions.push({
      fitid,
      date: normalizeOfxDate(date),
      amount: parseOfxAmount(amountRaw),
      type: (readXmlText(t.TRNTYPE) ?? "OTHER").toUpperCase(),
      description: [name, memo].filter(Boolean).join(" — ") || fitid,
      memo: memo || undefined,
      checkNum: readXmlText(t.CHECKNUM) ?? undefined,
    });
  }

  const bankTranList = stmtrs?.BANKTRANLIST as Record<string, unknown> | undefined;
  const periodStart = readXmlText(bankTranList?.DTSTART);
  const periodEnd = readXmlText(bankTranList?.DTEND);

  return {
    meta: {
      bankId,
      accountId,
      accountType,
      currency,
      periodStart: periodStart ? normalizeOfxDate(periodStart) : null,
      periodEnd: periodEnd ? normalizeOfxDate(periodEnd) : null,
      balance: balanceRaw != null ? parseOfxAmount(balanceRaw) : null,
      duplicateFitids: [],
    },
    transactions,
  };
}

function detectDuplicateFitids(transactions: OfxTransaction[]): string[] {
  const seen = new Set<string>();
  const dupes: string[] = [];
  for (const t of transactions) {
    const key = t.fitid.trim();
    if (seen.has(key)) dupes.push(key);
    else seen.add(key);
  }
  return dupes;
}

function transactionsToRows(
  transactions: OfxTransaction[],
  meta: OfxParseMeta,
): ImportRawRow[] {
  return transactions.map((t) => ({
    fitid: t.fitid,
    date: t.date,
    amount: t.amount,
    type: t.type,
    description: t.description,
    bank_id: meta.bankId ?? "",
    account_id: meta.accountId ?? "",
    period_start: meta.periodStart ?? "",
    period_end: meta.periodEnd ?? "",
    balance: meta.balance ?? "",
  }));
}

export function parseOfxBuffer(
  buffer: Buffer | ArrayBuffer | Uint8Array,
  fileName: string,
): ImportParseResult {
  const text = toBuffer(buffer).toString("utf8");
  if (!text.trim()) {
    throw new Error("Arquivo OFX vazio.");
  }

  const trimmed = text.trimStart();
  const isSgml =
    /^OFXHEADER:/im.test(text) || /DATA:OFXSGML/i.test(text);
  const isXml =
    !isSgml &&
    (trimmed.startsWith("<?xml") || /<OFX[\s>]/i.test(text));

  const { meta, transactions } = isXml ? parseXmlOfx(text) : parseSgmlOfx(text);

  if (transactions.length === 0) {
    throw new Error(
      "Nenhuma transação OFX (STMTTRN) encontrada. Verifique se o extrato contém movimentações.",
    );
  }

  meta.duplicateFitids = detectDuplicateFitids(transactions);
  const warnings: string[] = [];
  if (meta.duplicateFitids.length > 0) {
    warnings.push(
      `${meta.duplicateFitids.length} FITID duplicado(s) no arquivo: ${meta.duplicateFitids.slice(0, 5).join(", ")}`,
    );
  }
  if (meta.currency) {
    warnings.push(`Moeda detectada: ${meta.currency}.`);
  }

  const rows = transactionsToRows(transactions, meta);
  const columns = OFX_COLUMNS.map((c) => ({
    ...c,
    sampleValues: rows.slice(0, 3).map((r) => normalizeText(r[c.key])).filter(Boolean),
  }));

  return {
    format: "ofx",
    fileName,
    columns,
    rows,
    totalRows: rows.length,
    emptyRowsRemoved: 0,
    warnings,
  };
}

export function parseOfxText(text: string, fileName: string): ImportParseResult {
  return parseOfxBuffer(Buffer.from(text, "utf8"), fileName);
}
