/**
 * Rede de lojas — CSV de vendas: leitura (importação) e escrita (exportação).
 * Puro (sem banco, sem React): roda no navegador, no servidor e nos testes.
 */
import { dataValida } from "./filtros.ts";

export type LojaRef = { id: string; slug: string; nome: string };

export type VendaImportada = {
  lojaId: string;
  data: string;
  salao: number;
  delivery: number;
  pedidosSalao: number;
  pedidosDelivery: number;
};

export type ErroImportacao = { linha: number; mensagem: string };

export type ResultadoImportacao = {
  linhas: VendaImportada[];
  erros: ErroImportacao[];
  /** Linhas de dados lidas (sem o cabeçalho e sem linhas em branco). */
  total: number;
};

export const LIMITE_LINHAS_IMPORTACAO = 5000;
const LIMITE_VALOR = 100_000_000;
const LIMITE_PEDIDOS = 1_000_000;

export const normalizar = (s: string): string =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** "R$ 1.234,56" · "1234.56" · "1.234" (milhar) · "12,5" → número; inválido → null. */
export function lerNumero(bruto: string): number | null {
  let s = bruto.replace(/\s|R\$/g, "");
  if (s === "") return null;
  if (!/^-?[\d.,]+$/.test(s)) return null;
  const temPonto = s.includes(".");
  const temVirgula = s.includes(",");
  if (temPonto && temVirgula) {
    const decimalVirgula = s.lastIndexOf(",") > s.lastIndexOf(".");
    s = decimalVirgula ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (temVirgula) {
    if ((s.match(/,/g) ?? []).length > 1) return null;
    s = s.replace(",", ".");
  } else if (temPonto) {
    if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
    else if ((s.match(/\./g) ?? []).length > 1) return null;
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** "2026-10-31" · "31/10/2026" · "31-10-2026" → "2026-10-31"; inválido → null. */
export function lerData(bruto: string): string | null {
  const s = bruto.trim();
  if (dataValida(s)) return s;
  const m = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(s);
  if (!m) return null;
  const iso = `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return dataValida(iso) ? iso : null;
}

/** Divide uma linha respeitando aspas. */
export function dividirLinha(linha: string, sep: string): string[] {
  const out: string[] = [];
  let atual = "";
  let aspas = false;
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i];
    if (aspas) {
      if (c === '"' && linha[i + 1] === '"') {
        atual += '"';
        i++;
      } else if (c === '"') aspas = false;
      else atual += c;
    } else if (c === '"') aspas = true;
    else if (c === sep) {
      out.push(atual);
      atual = "";
    } else atual += c;
  }
  out.push(atual);
  return out.map((x) => x.trim());
}

function detectarSeparador(amostra: string): string {
  if (amostra.includes(";")) return ";";
  if (amostra.includes("\t")) return "\t";
  return ",";
}

const ALIAS: Record<string, "loja" | "data" | "salao" | "delivery" | "pedidosSalao" | "pedidosDelivery"> = {
  loja: "loja",
  unidade: "loja",
  data: "data",
  dia: "data",
  salao: "salao",
  "venda salao": "salao",
  "vendas salao": "salao",
  "faturamento salao": "salao",
  delivery: "delivery",
  "venda delivery": "delivery",
  "vendas delivery": "delivery",
  "faturamento delivery": "delivery",
  "pedidos salao": "pedidosSalao",
  "pedidos delivery": "pedidosDelivery",
};

const COLUNAS_PADRAO = ["loja", "data", "salao", "delivery", "pedidosSalao", "pedidosDelivery"] as const;

/**
 * Lê o texto de um CSV de vendas por dia. Colunas: loja, data, salão, delivery,
 * pedidos salão, pedidos delivery (com ou sem cabeçalho; nesse caso nessa ordem).
 * Cada linha ruim vira um erro com o número da linha; as boas seguem.
 */
export function lerVendasCsv(texto: string, lojas: readonly LojaRef[], hoje: string): ResultadoImportacao {
  const linhasBrutas = texto
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .map((l, i) => ({ n: i + 1, t: l }))
    .filter((l) => l.t.trim() !== "");
  const erros: ErroImportacao[] = [];
  if (linhasBrutas.length === 0) return { linhas: [], erros: [{ linha: 0, mensagem: "O arquivo está vazio." }], total: 0 };

  const sep = detectarSeparador(linhasBrutas[0].t);
  let colunas: (typeof COLUNAS_PADRAO)[number][] = [...COLUNAS_PADRAO];
  let inicio = 0;
  const primeira = dividirLinha(linhasBrutas[0].t, sep).map((c) => ALIAS[normalizar(c)]);
  if (primeira.some(Boolean)) {
    // Há cabeçalho: exige as colunas obrigatórias.
    const faltando = (["loja", "data", "salao", "delivery"] as const).filter((c) => !primeira.includes(c));
    if (faltando.length > 0) {
      return { linhas: [], erros: [{ linha: linhasBrutas[0].n, mensagem: `Cabeçalho sem as colunas: ${faltando.join(", ")}.` }], total: 0 };
    }
    colunas = primeira as typeof colunas;
    inicio = 1;
  }

  const dados = linhasBrutas.slice(inicio);
  if (dados.length > LIMITE_LINHAS_IMPORTACAO) {
    return { linhas: [], erros: [{ linha: 0, mensagem: `O arquivo tem ${dados.length} linhas; o máximo por importação é ${LIMITE_LINHAS_IMPORTACAO}.` }], total: dados.length };
  }

  const porSlug = new Map(lojas.map((l) => [l.slug, l] as const));
  const porNome = new Map(lojas.map((l) => [normalizar(l.nome), l] as const));
  const vistos = new Set<string>();
  const linhas: VendaImportada[] = [];

  for (const { n, t } of dados) {
    const cel = dividirLinha(t, sep);
    const v: Partial<Record<(typeof COLUNAS_PADRAO)[number], string>> = {};
    colunas.forEach((c, i) => {
      if (c) v[c] = cel[i] ?? "";
    });
    const refLoja = (v.loja ?? "").trim();
    const loja = porSlug.get(refLoja.toLowerCase()) ?? porNome.get(normalizar(refLoja));
    if (!loja) {
      erros.push({ linha: n, mensagem: `Loja "${refLoja}" não encontrada (ou sem acesso).` });
      continue;
    }
    const data = lerData(v.data ?? "");
    if (!data) {
      erros.push({ linha: n, mensagem: `Data inválida: "${v.data ?? ""}". Use AAAA-MM-DD ou DD/MM/AAAA.` });
      continue;
    }
    if (data > hoje) {
      erros.push({ linha: n, mensagem: `Data no futuro: ${data}.` });
      continue;
    }
    const salao = v.salao === undefined || v.salao === "" ? 0 : lerNumero(v.salao);
    const delivery = v.delivery === undefined || v.delivery === "" ? 0 : lerNumero(v.delivery);
    const ps = v.pedidosSalao === undefined || v.pedidosSalao === "" ? 0 : lerNumero(v.pedidosSalao);
    const pd = v.pedidosDelivery === undefined || v.pedidosDelivery === "" ? 0 : lerNumero(v.pedidosDelivery);
    if (salao == null || delivery == null || ps == null || pd == null) {
      erros.push({ linha: n, mensagem: "Valor numérico inválido." });
      continue;
    }
    if (salao < 0 || delivery < 0 || ps < 0 || pd < 0) {
      erros.push({ linha: n, mensagem: "Valores não podem ser negativos." });
      continue;
    }
    if (salao > LIMITE_VALOR || delivery > LIMITE_VALOR || ps > LIMITE_PEDIDOS || pd > LIMITE_PEDIDOS) {
      erros.push({ linha: n, mensagem: "Valor acima do limite aceito." });
      continue;
    }
    if (!Number.isInteger(ps) || !Number.isInteger(pd)) {
      erros.push({ linha: n, mensagem: "Pedidos devem ser números inteiros." });
      continue;
    }
    const chave = `${loja.id}|${data}`;
    if (vistos.has(chave)) {
      erros.push({ linha: n, mensagem: `Linha repetida para ${loja.nome} em ${data}.` });
      continue;
    }
    vistos.add(chave);
    linhas.push({
      lojaId: loja.id,
      data,
      salao: Math.round(salao * 100) / 100,
      delivery: Math.round(delivery * 100) / 100,
      pedidosSalao: ps,
      pedidosDelivery: pd,
    });
  }
  return { linhas, erros, total: dados.length };
}

/* ------------------------------------------------------------------ escrita */

type Celula = string | number | null | undefined;

/**
 * Texto que começa com = + - @ vira fórmula no Excel; o apóstrofo neutraliza.
 * Números ficam como estão (negativo legítimo não é texto).
 */
function celula(c: Celula): string {
  if (c == null) return "";
  if (typeof c === "number") return Number.isFinite(c) ? String(c).replace(".", ",") : "";
  const s = /^[=+\-@\t\r]/.test(c) ? `'${c}` : c;
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV para Excel brasileiro: separador `;`, decimal vírgula, UTF-8 com BOM. */
export function gerarCsv(linhas: readonly (readonly Celula[])[]): string {
  return `﻿${linhas.map((l) => l.map(celula).join(";")).join("\r\n")}\r\n`;
}
