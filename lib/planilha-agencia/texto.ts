/**
 * Funções pequenas para ler células de planilha: texto sem acento, número em formato brasileiro,
 * datas (inclusive o número de série do Excel) e rótulos de mês ("abr/26", "Novembro de 2026").
 */
import {
  parseBrazilianOrAmericanNumber,
  parseFlexibleDate,
} from "../import-engine/parsers/normalize.ts";

/** Texto da célula, sem espaços sobrando. Datas e números viram texto simples. */
export function celulaTexto(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v.replace(/\s+/g, " ").trim();
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "";
  if (typeof v === "boolean") return v ? "verdadeiro" : "falso";
  return String(v).trim();
}

/** Minúsculas, sem acento nem pontuação — para comparar rótulos. */
export function sem(v: unknown): string {
  return celulaTexto(v)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9%\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function numeroDe(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "boolean") return null;
  const r = parseBrazilianOrAmericanNumber(v);
  return r.value;
}

/** Número de série do Excel entre 2000 e 2099 (36526 = 01/01/2000, 73415 = 31/12/2099). */
export function pareceSerialDeData(n: number): boolean {
  return Number.isFinite(n) && n >= 36526 && n <= 73415;
}

export function dataIso(v: unknown): string | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") {
    if (!pareceSerialDeData(v)) return null;
    return parseFlexibleDate(Math.floor(v)).value;
  }
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return null;
    // Datas lidas sem hora: usa o calendário local para não "voltar um dia".
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, "0");
    const d = String(v.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const s = celulaTexto(v);
  if (!s) return null;
  if (/^\d{5}$/.test(s)) {
    const n = Number(s);
    return pareceSerialDeData(n) ? parseFlexibleDate(n).value : null;
  }
  const r = parseFlexibleDate(s);
  if (!r.value) return null;
  const ano = Number(r.value.slice(0, 4));
  return ano >= 2000 && ano <= 2099 ? r.value : null;
}

const NOMES_MES: Array<[string, number]> = [
  ["janeiro", 1],
  ["fevereiro", 2],
  ["marco", 3],
  ["abril", 4],
  ["maio", 5],
  ["junho", 6],
  ["julho", 7],
  ["agosto", 8],
  ["setembro", 9],
  ["outubro", 10],
  ["novembro", 11],
  ["dezembro", 12],
];

const ABREV_MES: Record<string, number> = {
  jan: 1,
  fev: 2,
  mar: 3,
  abr: 4,
  mai: 5,
  jun: 6,
  jul: 7,
  ago: 8,
  set: 9,
  sept: 9,
  out: 10,
  nov: 11,
  dez: 12,
};

export type MesLido = { ano: number | null; mes: number };

/**
 * Lê um mês de um rótulo: data (serial do Excel ou texto), "04/2026", "abr/26", "Abril de 2026",
 * "ABRIL". O ano vem `null` quando o rótulo não diz.
 */
export function mesDe(v: unknown): MesLido | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") {
    if (!pareceSerialDeData(v)) return null;
    const iso = parseFlexibleDate(Math.floor(v)).value;
    if (!iso) return null;
    return { ano: Number(iso.slice(0, 4)), mes: Number(iso.slice(5, 7)) };
  }
  if (v instanceof Date) {
    const iso = dataIso(v);
    return iso ? { ano: Number(iso.slice(0, 4)), mes: Number(iso.slice(5, 7)) } : null;
  }
  const s = sem(v);
  if (!s || s.length > 30) return null;

  let m = /^(\d{1,2})\s*[/-]\s*(\d{4}|\d{2})$/.exec(s);
  if (m) {
    const mes = Number(m[1]);
    if (mes < 1 || mes > 12) return null;
    const a = Number(m[2]);
    return { ano: m[2].length === 2 ? 2000 + a : a, mes };
  }
  m = /^(\d{4})\s*[/-]\s*(\d{1,2})$/.exec(s);
  if (m) {
    const mes = Number(m[2]);
    if (mes < 1 || mes > 12) return null;
    return { ano: Number(m[1]), mes };
  }
  const d = dataIso(typeof v === "string" ? v : null);
  if (d && /\d/.test(s) && /[/-]/.test(String(v))) {
    return { ano: Number(d.slice(0, 4)), mes: Number(d.slice(5, 7)) };
  }

  const tokens = s.split(" ").filter(Boolean);
  for (const [nome, mes] of NOMES_MES) {
    if (tokens[0] === nome) {
      const ano = tokens.find((t) => /^\d{4}$/.test(t));
      const ano2 = tokens.find((t) => /^\d{2}$/.test(t));
      return { ano: ano ? Number(ano) : ano2 ? 2000 + Number(ano2) : null, mes };
    }
  }
  const ab = /^([a-z]{3,4})\s*[/-]?\s*(\d{4}|\d{2})?$/.exec(s);
  if (ab && ABREV_MES[ab[1]]) {
    const a = ab[2];
    return {
      ano: a ? (a.length === 2 ? 2000 + Number(a) : Number(a)) : null,
      mes: ABREV_MES[ab[1]],
    };
  }
  return null;
}

/** Procura o nome de um mês dentro de um texto longo ("DASHBOARD EXECUTIVO · NOVEMBRO"). */
export function mesNoTexto(v: unknown): number | null {
  const s = sem(v);
  if (!s) return null;
  const tokens = s.split(" ");
  for (const t of tokens) {
    const hit = NOMES_MES.find(([nome]) => nome === t);
    if (hit) return hit[1];
  }
  return null;
}

export const pad2 = (n: number) => String(n).padStart(2, "0");

export function mesChave(ano: number, mes: number): string {
  return `${ano}-${pad2(mes)}`;
}

export function somaMeses(chave: string, delta: number): string {
  const ano = Number(chave.slice(0, 4));
  const mes = Number(chave.slice(5, 7));
  const idx = ano * 12 + (mes - 1) + delta;
  return mesChave(Math.floor(idx / 12), (idx % 12) + 1);
}

export function ultimoDiaDoMes(chave: string): string {
  const ano = Number(chave.slice(0, 4));
  const mes = Number(chave.slice(5, 7));
  const dia = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  return `${chave}-${pad2(dia)}`;
}

export function letraDaColuna(indice: number): string {
  let n = indice + 1;
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export function arredonda2(n: number): number {
  return Math.round(n * 100) / 100;
}
