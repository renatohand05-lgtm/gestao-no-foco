/**
 * Leitor de planilhas: .xlsx, .xlsb, .xls e .csv viram uma lista de abas (matrizes de células).
 * Bloqueia arquivos com macro e limita o tamanho para não derrubar o servidor.
 */
import * as XLSX from "xlsx";

import { assertImportFileWithinLimit } from "../import-engine/import-file-limits.ts";
import type { Aba, Planilha } from "./tipos.ts";

export const EXTENSOES_ACEITAS = [".xlsx", ".xlsb", ".xls", ".csv"] as const;

const MAX_LINHAS_POR_ABA = 20000;
const MAX_COLUNAS_POR_ABA = 120;
const MAX_ABAS = 60;

function extensaoDe(nome: string): string {
  const baixo = nome.trim().toLowerCase();
  const i = baixo.lastIndexOf(".");
  return i < 0 ? "" : baixo.slice(i);
}

function contem(bytes: Uint8Array, texto: string): boolean {
  return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).includes(texto);
}

function comecaCom(bytes: Uint8Array, assinatura: number[]): boolean {
  if (bytes.length < assinatura.length) return false;
  return assinatura.every((b, i) => bytes[i] === b);
}

/** Lança um erro em português se o arquivo não for uma planilha segura. */
export function validarArquivoDePlanilha(nomeArquivo: string, bytes: Uint8Array): string {
  const ext = extensaoDe(nomeArquivo);
  if (!(EXTENSOES_ACEITAS as readonly string[]).includes(ext)) {
    if (ext === ".xlsm" || ext === ".xlsb.xlsm") {
      throw new Error(
        "Planilhas com macro (.xlsm) são bloqueadas por segurança. No Excel, use Salvar como e escolha .xlsx (sem macros).",
      );
    }
    throw new Error("Envie a planilha em .xlsx, .xlsb, .xls ou .csv.");
  }
  assertImportFileWithinLimit({ fileName: nomeArquivo, byteLength: bytes.byteLength });

  if (ext === ".xlsx" || ext === ".xlsb") {
    if (!comecaCom(bytes, [0x50, 0x4b])) {
      throw new Error(`O arquivo não parece ser um ${ext} válido. Abra no Excel e salve de novo.`);
    }
    if (contem(bytes, "vbaProject.bin") || contem(bytes, "macrosheets/")) {
      throw new Error(
        "A planilha contém macros (VBA). Por segurança o portal não lê esse tipo de arquivo. No Excel, use Salvar como e escolha .xlsx ou .xlsb sem macros.",
      );
    }
  } else if (ext === ".xls") {
    const ole = comecaCom(bytes, [0xd0, 0xcf, 0x11, 0xe0]);
    if (!ole && !comecaCom(bytes, [0x50, 0x4b])) {
      throw new Error("O arquivo não parece ser um .xls válido. Abra no Excel e salve de novo.");
    }
    if (contem(bytes, "_VBA_PROJECT") || contem(bytes, "VBA/")) {
      throw new Error(
        "A planilha contém macros (VBA). Por segurança o portal não lê esse tipo de arquivo. Salve como .xlsx sem macros.",
      );
    }
  } else if (ext === ".csv") {
    const amostra = bytes.subarray(0, Math.min(bytes.length, 4096));
    if (amostra.some((b) => b === 0)) {
      throw new Error("O arquivo .csv parece ser binário. Verifique se ele não está corrompido.");
    }
  }
  return ext;
}

function textoDoCsv(bytes: Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

function delimitadorDoCsv(texto: string): string {
  const primeira = texto.split(/\r?\n/, 1)[0] ?? "";
  const cont = (c: string) => primeira.split(c).length - 1;
  const opcoes: Array<[string, number]> = [
    [";", cont(";")],
    ["\t", cont("\t")],
    [",", cont(",")],
    ["|", cont("|")],
  ];
  opcoes.sort((a, b) => b[1] - a[1]);
  return opcoes[0][1] > 0 ? opcoes[0][0] : ",";
}

function valorDaCelula(celula: XLSX.CellObject | undefined): unknown {
  if (!celula) return null;
  switch (celula.t) {
    case "n":
      return typeof celula.v === "number" && Number.isFinite(celula.v) ? celula.v : null;
    case "s":
      return typeof celula.v === "string" && celula.v !== "" ? celula.v : null;
    case "b":
      return Boolean(celula.v);
    case "d":
      return celula.v instanceof Date ? celula.v : null;
    default:
      // Erros de fórmula (#NOME?, #REF!) e células vazias.
      return null;
  }
}

function abaDoSheet(nome: string, ws: XLSX.WorkSheet, oculta: boolean): Aba | null {
  const ref = ws["!ref"];
  if (!ref) return null;
  const faixa = XLSX.utils.decode_range(ref);
  const fimLinha = Math.min(faixa.e.r, faixa.s.r + MAX_LINHAS_POR_ABA - 1);
  const fimColuna = Math.min(faixa.e.c, faixa.s.c + MAX_COLUNAS_POR_ABA - 1);
  const linhas: unknown[][] = [];
  for (let r = faixa.s.r; r <= fimLinha; r++) {
    const linha: unknown[] = [];
    for (let c = faixa.s.c; c <= fimColuna; c++) {
      linha.push(valorDaCelula(ws[XLSX.utils.encode_cell({ r, c })]));
    }
    linhas.push(linha);
  }
  return { nome, linhaInicial: faixa.s.r + 1, colunaInicial: faixa.s.c, oculta, linhas };
}

export function lerPlanilha(nomeArquivo: string, bytes: Uint8Array): Planilha {
  const ext = validarArquivoDePlanilha(nomeArquivo, bytes);

  let wb: XLSX.WorkBook;
  try {
    if (ext === ".csv") {
      const texto = textoDoCsv(bytes);
      wb = XLSX.read(texto, {
        type: "string",
        raw: true,
        FS: delimitadorDoCsv(texto),
        cellFormula: false,
      });
    } else {
      wb = XLSX.read(bytes, {
        type: "array",
        cellDates: false,
        cellFormula: false,
        cellHTML: false,
        cellStyles: false,
        sheetStubs: false,
        bookVBA: false,
      });
    }
  } catch {
    throw new Error(
      "Não consegui abrir a planilha. Abra o arquivo no Excel, salve de novo como .xlsx e tente outra vez.",
    );
  }

  const ocultas = wb.Workbook?.Sheets ?? [];
  const abas: Aba[] = [];
  wb.SheetNames.slice(0, MAX_ABAS).forEach((nome, i) => {
    const ws = wb.Sheets[nome];
    if (!ws) return;
    const aba = abaDoSheet(nome, ws, Boolean(ocultas[i]?.Hidden));
    if (aba) abas.push(aba);
  });

  if (!abas.length) {
    throw new Error("A planilha está vazia: nenhuma aba com dados.");
  }
  return { nomeArquivo, abas };
}
