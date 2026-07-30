"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { previewStockFileImportAction } from "@/lib/catalog-import/catalog-import-actions";
import { previewInvoiceXmlImportAction } from "@/lib/catalog-import/invoice-import-actions";

type Props = {
  tenantSlug: string;
};

export function StockInvoiceImportPanel({ tenantSlug }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div>
        <h2 className="text-base font-semibold">Importar estoque / NF-e</h2>
        <p className="text-sm text-muted-foreground">
          Excel de produtos/saldo e XML de NF-e com preview Enterprise. PDF DANFE
          não é processado como nota.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm">
          <span>Arquivo Excel/CSV de produtos</span>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            aria-label="Arquivo de produtos e estoque"
            disabled={pending}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setError(null);
              setInfo(null);
              startTransition(() => {
                void (async () => {
                  try {
                    const fd = new FormData();
                    fd.set("file", file);
                    const res = await previewStockFileImportAction(
                      tenantSlug,
                      fd,
                    );
                    setInfo(
                      `Preview: ${res.summary.totalRows} linhas · novos ${res.summary.newProducts} · duplicidades ${res.summary.duplicates} · qty ${res.summary.stockQtyTotal ?? "—"} · valor ${res.summary.stockValueTotal ?? "—"}. Confirme no fluxo de importação após revisão.`,
                    );
                  } catch (err) {
                    setError(
                      err instanceof Error ? err.message : "Falha no preview",
                    );
                  }
                })();
              });
            }}
          />
        </label>

        <label className="space-y-2 text-sm">
          <span>XML de NF-e</span>
          <input
            type="file"
            accept=".xml,application/xml,text/xml"
            aria-label="Arquivo XML de NF-e"
            disabled={pending}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setError(null);
              setInfo(null);
              startTransition(() => {
                void (async () => {
                  try {
                    const fd = new FormData();
                    fd.set("file", file);
                    const res = await previewInvoiceXmlImportAction(
                      tenantSlug,
                      fd,
                    );
                    setInfo(
                      `NF ${res.chaveAcesso}: ${res.summary.totalRows} itens · total ${res.summary.financialTotal ?? "—"} · ${res.alreadyExists ? "já existe" : "nova"} · baixa confiança ${res.summary.lowConfidence}.`,
                    );
                    if (res.redirectTo) {
                      router.push(res.redirectTo);
                    }
                  } catch (err) {
                    setError(
                      err instanceof Error ? err.message : "XML inválido",
                    );
                  }
                })();
              });
            }}
          />
        </label>
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={() =>
          router.push(`/${tenantSlug}/estoque/notas-fiscais`)
        }
      >
        Abrir notas fiscais
      </Button>

      {info ? (
        <p className="text-sm" role="status">
          {info}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
