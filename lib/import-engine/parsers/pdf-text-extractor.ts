/**
 * Sprint 22.8 — Extração heurística de texto de PDF (sem biblioteca npm).
 * Suporta streams não comprimidos e FlateDecode. Sem OCR — PDFs image-only
 * retornam status image_only.
 */
import { inflateSync } from "node:zlib";

export type PdfTextExtractionStatus = "ok" | "image_only";

export type PdfTextExtractionResult = {
  status: PdfTextExtractionStatus;
  text: string;
  pageCount: number;
  warnings: string[];
};

export class PdfCorruptedError extends Error {
  code = "pdf_corrupted" as const;

  constructor(message: string) {
    super(message);
    this.name = "PdfCorruptedError";
  }
}

function toUint8Array(bytes: Buffer | ArrayBuffer | Uint8Array): Uint8Array {
  if (Buffer.isBuffer(bytes)) return bytes;
  if (bytes instanceof ArrayBuffer) return new Uint8Array(bytes);
  return bytes;
}

function toBuffer(bytes: Buffer | ArrayBuffer | Uint8Array): Buffer {
  if (Buffer.isBuffer(bytes)) return bytes;
  return Buffer.from(bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : bytes);
}

/** Valida assinatura %PDF no início do arquivo. */
export function validatePdfSignature(bytes: Buffer | ArrayBuffer | Uint8Array): void {
  const arr = toUint8Array(bytes);
  if (arr.length < 5) {
    throw new PdfCorruptedError("Arquivo PDF corrompido ou incompleto (tamanho insuficiente).");
  }
  const header = Buffer.from(arr.subarray(0, Math.min(arr.length, 16))).toString("latin1");
  if (!header.startsWith("%PDF-")) {
    throw new PdfCorruptedError(
      "Assinatura PDF inválida — o arquivo deve iniciar com %PDF-.",
    );
  }
  const tail = Buffer.from(
    arr.subarray(Math.max(0, arr.length - 128)),
  ).toString("latin1");
  if (!tail.includes("%%EOF")) {
    throw new PdfCorruptedError(
      "Arquivo PDF corrompido ou truncado (marcador %%EOF ausente).",
    );
  }
}

function unescapePdfString(raw: string): string {
  return raw
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\");
}

function extractLiteralStrings(content: string): string[] {
  const parts: string[] = [];
  const literalRe = /\((?:\\.|[^\\()])*\)/g;
  let m: RegExpExecArray | null;
  while ((m = literalRe.exec(content)) !== null) {
    const inner = m[0].slice(1, -1);
    parts.push(unescapePdfString(inner));
  }
  return parts;
}

function extractHexStrings(content: string): string[] {
  const parts: string[] = [];
  const hexRe = /<([0-9A-Fa-f\s]+)>/g;
  let m: RegExpExecArray | null;
  while ((m = hexRe.exec(content)) !== null) {
    const hex = m[1].replace(/\s/g, "");
    if (hex.length % 2 !== 0) continue;
    let decoded = "";
    for (let i = 0; i < hex.length; i += 2) {
      const code = parseInt(hex.slice(i, i + 2), 16);
      if (Number.isFinite(code)) decoded += String.fromCharCode(code);
    }
    if (decoded) parts.push(decoded);
  }
  return parts;
}

function extractTextFromContentStream(streamText: string): string {
  const chunks: string[] = [];
  const btBlocks = streamText.match(/BT[\s\S]*?ET/g) ?? [];
  for (const block of btBlocks) {
    chunks.push(...extractLiteralStrings(block));
    chunks.push(...extractHexStrings(block));
  }
  if (chunks.length === 0) {
    chunks.push(...extractLiteralStrings(streamText));
    chunks.push(...extractHexStrings(streamText));
  }
  return chunks.join(" ").replace(/\s+/g, " ").trim();
}

function decodeStreamBytes(raw: Buffer, filter: string | null): Buffer {
  if (filter === "FlateDecode" || filter === "/FlateDecode") {
    try {
      return inflateSync(raw);
    } catch {
      return raw;
    }
  }
  return raw;
}

function extractStreamBodies(pdfText: string, _pdfBuf?: Buffer): string[] {
  void _pdfBuf;
  const bodies: string[] = [];
  const streamRe = /(\d+)\s+(\d+)\s+obj[\s\S]*?<<([\s\S]*?)>>\s*stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let m: RegExpExecArray | null;
  while ((m = streamRe.exec(pdfText)) !== null) {
    const dict = m[3];
    const rawBody = m[4];
    let filter: string | null = null;
    const filterMatch = dict.match(/\/Filter\s*\/(\w+)/);
    if (filterMatch) filter = filterMatch[1];

    const rawBytes = Buffer.from(rawBody, "latin1");
    const decoded = decodeStreamBytes(rawBytes, filter);
    bodies.push(decoded.toString("latin1"));
  }

  if (bodies.length === 0) {
    const looseRe = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    while ((m = looseRe.exec(pdfText)) !== null) {
      bodies.push(m[1]);
    }
  }

  return bodies;
}

function countPages(pdfText: string): number {
  const pageMatches = pdfText.match(/\/Type\s*\/Page\b/g);
  return pageMatches?.length ?? 1;
}

/**
 * Extrai texto pesquisável de um buffer PDF.
 * PDFs sem texto extraível (image-only) retornam status image_only — sem OCR.
 */
export function extractPdfText(
  bytes: Buffer | ArrayBuffer | Uint8Array,
): PdfTextExtractionResult {
  validatePdfSignature(bytes);
  const buf = toBuffer(bytes);
  const pdfText = buf.toString("latin1");
  const warnings: string[] = [];
  const pageCount = countPages(pdfText);

  const streamBodies = extractStreamBodies(pdfText, buf);
  const pageTexts: string[] = [];

  for (const body of streamBodies) {
    const text = extractTextFromContentStream(body);
    if (text) pageTexts.push(text);
  }

  const combined = pageTexts.join("\f").trim();

  if (!combined) {
    return {
      status: "image_only",
      text: "",
      pageCount,
      warnings: [
        "PDF sem texto pesquisável detectado (provavelmente image-only). OCR não está disponível nesta fase.",
      ],
    };
  }

  if (pageCount > 1 && !combined.includes("\f")) {
    warnings.push(
      `PDF com ${pageCount} página(s) — quebras de página inferidas quando possível.`,
    );
  }

  return {
    status: "ok",
    text: combined,
    pageCount,
    warnings,
  };
}
