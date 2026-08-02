/**
 * Sprint 27.8 — View-model de DRE comparativo (dois getDre, sem alterar engine).
 */

import {
  classifyDreLinhaSemantic,
  getDreVarianceSemantic,
  type DreVarianceTone,
} from "@/lib/dre/dre-variance-semantics";

/** Subconjunto tipado local — evita path alias em testes Node. */
type DreLinhaLike = {
  codigo: string;
  label: string;
  valor: number;
  destaque?: boolean;
  depth?: number;
  drillable?: boolean;
  dreLinha?: string;
  children?: DreLinhaLike[];
};

type DreResultLike = {
  resumo: {
    receita_bruta: number;
    receita_liquida: number;
  };
  linhas: DreLinhaLike[];
};

export type DreComparativeRow = {
  codigo: string;
  label: string;
  destaque?: boolean;
  depth: number;
  valorA: number | null;
  valorB: number | null;
  pctReceitaA: number | null;
  pctReceitaB: number | null;
  diffReais: number | null;
  variancePct: number | null;
  tone: DreVarianceTone;
  toneLabel: string;
  toneCss: string;
  icon: "up" | "down" | "flat" | "na";
  drillable?: boolean;
  dreLinha?: string;
};

export function buildCalendarMonthPeriod(
  year: number,
  month1to12: number,
): { dataDe: string; dataAte: string } {
  const m = Math.min(12, Math.max(1, Math.floor(month1to12)));
  const y = Math.floor(year);
  const dataDe = `${y}-${String(m).padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const dataAte = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { dataDe, dataAte };
}

function flattenLines(lines: DreLinhaLike[], depth = 0): DreLinhaLike[] {
  const out: DreLinhaLike[] = [];
  for (const line of lines) {
    out.push({ ...line, depth: line.depth ?? depth });
    if (line.children?.length) {
      out.push(...flattenLines(line.children, (line.depth ?? depth) + 1));
    }
  }
  return out;
}

function pctOf(value: number | null, base: number | null): number | null {
  if (value == null || base == null || base === 0) return null;
  return (value / base) * 100;
}

function variancePct(
  current: number | null,
  previous: number | null,
): number | null {
  if (current == null || previous == null) return null;
  if (previous === 0) {
    if (current === 0) return 0;
    return null;
  }
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function buildDreComparativeView(
  periodA: DreResultLike,
  periodB: DreResultLike,
  labels: { mesA: string; mesB: string },
): {
  labels: { mesA: string; mesB: string };
  baseReceitaA: number | null;
  baseReceitaB: number | null;
  rows: DreComparativeRow[];
} {
  const baseReceitaA =
    periodA.resumo.receita_liquida ?? periodA.resumo.receita_bruta ?? null;
  const baseReceitaB =
    periodB.resumo.receita_liquida ?? periodB.resumo.receita_bruta ?? null;

  const mapA = new Map(
    flattenLines(periodA.linhas).map((l) => [String(l.codigo), l]),
  );
  const mapB = new Map(
    flattenLines(periodB.linhas).map((l) => [String(l.codigo), l]),
  );

  const order: string[] = [];
  for (const l of flattenLines(periodA.linhas)) {
    const c = String(l.codigo);
    if (!order.includes(c)) order.push(c);
  }
  for (const l of flattenLines(periodB.linhas)) {
    const c = String(l.codigo);
    if (!order.includes(c)) order.push(c);
  }

  const rows: DreComparativeRow[] = order.map((codigo) => {
    const a = mapA.get(codigo);
    const b = mapB.get(codigo);
    const label = a?.label ?? b?.label ?? codigo;
    const valorA = a ? a.valor : null;
    const valorB = b ? b.valor : null;
    const diffReais =
      valorA != null && valorB != null ? valorB - valorA : null;
    const accountType = classifyDreLinhaSemantic(codigo);
    const semantic = getDreVarianceSemantic({
      accountType:
        valorA == null || valorB == null ? "indisponivel" : accountType,
      currentValue: valorB,
      previousValue: valorA,
      variance: diffReais,
    });

    return {
      codigo,
      label,
      destaque: a?.destaque ?? b?.destaque,
      depth: a?.depth ?? b?.depth ?? 0,
      valorA,
      valorB,
      pctReceitaA: pctOf(valorA, baseReceitaA),
      pctReceitaB: pctOf(valorB, baseReceitaB),
      diffReais,
      variancePct: variancePct(valorB, valorA),
      tone: semantic.tone,
      toneLabel: semantic.label,
      toneCss: semantic.cssClass,
      icon: semantic.icon,
      drillable: a?.drillable ?? b?.drillable,
      dreLinha: a?.dreLinha ?? b?.dreLinha,
    };
  });

  return {
    labels,
    baseReceitaA,
    baseReceitaB,
    rows,
  };
}

export const MONTH_LABELS_PT = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const;
