import { csvEscapeCell } from "@/lib/analytics/core/csv-safe";
import type { DreComparativeRow } from "@/lib/dre/dre-compare";

function fmt(n: number | null): string {
  if (n == null) return "Indisponível";
  return n.toFixed(2);
}

export function buildDreComparativeCsv(
  rows: DreComparativeRow[],
  meta: {
    empresa?: string;
    mesA: string;
    mesB: string;
    emittedAt: string;
  },
): string {
  const lines: string[] = [
    ["DRE — Comparativo Mensal"].map(csvEscapeCell).join(","),
    ["Empresa", meta.empresa ?? ""].map(csvEscapeCell).join(","),
    ["Período A", meta.mesA].map(csvEscapeCell).join(","),
    ["Período B", meta.mesB].map(csvEscapeCell).join(","),
    ["Emitido em", meta.emittedAt].map(csvEscapeCell).join(","),
    "",
    [
      "Conta",
      `${meta.mesA} (R$)`,
      `${meta.mesA} (% receita)`,
      `${meta.mesB} (R$)`,
      `${meta.mesB} (% receita)`,
      "Diferença (R$)",
      "Variação (%)",
      "Semântica",
    ]
      .map(csvEscapeCell)
      .join(","),
    ...rows.map((r) =>
      [
        `${"  ".repeat(r.depth)}${r.label}`,
        fmt(r.valorA),
        r.pctReceitaA == null ? "Indisponível" : r.pctReceitaA.toFixed(2),
        fmt(r.valorB),
        r.pctReceitaB == null ? "Indisponível" : r.pctReceitaB.toFixed(2),
        fmt(r.diffReais),
        r.variancePct == null ? "Indisponível" : r.variancePct.toFixed(2),
        r.toneLabel,
      ]
        .map(csvEscapeCell)
        .join(","),
    ),
  ];

  return `\uFEFF${lines.join("\n")}\n`;
}

export function buildDreComparativeExcelRows(
  rows: DreComparativeRow[],
  meta: { mesA: string; mesB: string },
): (string | number)[][] {
  return [
    ["DRE — Comparativo Mensal"],
    ["Mês A", meta.mesA],
    ["Mês B", meta.mesB],
    [],
    [
      "Conta",
      `${meta.mesA} R$`,
      `${meta.mesA} %`,
      `${meta.mesB} R$`,
      `${meta.mesB} %`,
      "Diff R$",
      "Var %",
      "Semântica",
    ],
    ...rows.map((r) => [
      `${"  ".repeat(r.depth)}${r.label}`,
      r.valorA ?? "Indisponível",
      r.pctReceitaA ?? "Indisponível",
      r.valorB ?? "Indisponível",
      r.pctReceitaB ?? "Indisponível",
      r.diffReais ?? "Indisponível",
      r.variancePct ?? "Indisponível",
      r.toneLabel,
    ]),
  ];
}
