"use client";

import {
  exportCommercialCsv,
  exportCommercialExcel,
  exportCommercialPdf,
} from "@/lib/metas/commercial-export";
import type { CommercialPanelData } from "@/types/commercial-panel";
import { Button } from "@/components/ui/button";

type Props = {
  data: CommercialPanelData;
  tenantName: string;
};

export function ComercialExportActions({ data, tenantName }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => exportCommercialCsv(data, tenantName)}
      >
        CSV
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => exportCommercialExcel(data, tenantName)}
      >
        Excel
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => exportCommercialPdf(data, tenantName)}
      >
        PDF
      </Button>
    </div>
  );
}
