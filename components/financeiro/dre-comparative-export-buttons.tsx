"use client";

import { Download, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  buildDreComparativeCsv,
  buildDreComparativeExcelRows,
} from "@/lib/dre/dre-export";
import type { DreComparativeRow } from "@/lib/dre/dre-compare";

type Props = {
  rows: DreComparativeRow[];
  mesA: string;
  mesB: string;
  empresa?: string;
};

export function DreComparativeExportButtons({
  rows,
  mesA,
  mesB,
  empresa,
}: Props) {
  function downloadCsv() {
    const csv = buildDreComparativeCsv(rows, {
      empresa,
      mesA,
      mesB,
      emittedAt: new Date().toISOString(),
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dre-comparativo-${mesA}-${mesB}.csv`.replace(/\s+/g, "-");
    a.click();
    URL.revokeObjectURL(url);
  }

  async function downloadExcel() {
    const XLSX = await import("xlsx");
    const aoa = buildDreComparativeExcelRows(rows, { mesA, mesB });
    const sheet = XLSX.utils.aoa_to_sheet(aoa);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "DRE Comparativo");
    XLSX.writeFile(
      book,
      `dre-comparativo-${mesA}-${mesB}.xlsx`.replace(/\s+/g, "-"),
    );
  }

  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <Button type="button" variant="outline" size="sm" onClick={downloadCsv}>
        <Download className="size-4" />
        CSV
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={downloadExcel}>
        <Download className="size-4" />
        Excel
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => window.print()}
      >
        <Printer className="size-4" />
        Imprimir / PDF
      </Button>
    </div>
  );
}
