"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  ImportFileDropzone,
  type SelectedImportFile,
} from "@/components/catalog-import/import-file-dropzone";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  commitStockFileImportAction,
  previewPdfAssistDocumentAction,
  previewStockFileImportAction,
} from "@/lib/catalog-import/catalog-import-actions";
import { previewInvoiceXmlImportAction } from "@/lib/catalog-import/invoice-import-actions";
import { clearImportDraftEverywhere } from "@/lib/import-engine/delete/draft-session";
import { IMPORT_LIMIT_MB_CLIENT_DEFAULTS } from "@/lib/import-engine/import-file-limits";
import type {
  ImportColumnMapping,
  ImportReviewRow,
} from "@/lib/import-engine";

type Props = {
  tenantSlug: string;
};

type StockPreview = {
  fileName: string;
  format: string;
  mapping: ImportColumnMapping;
  reviewRows: ImportReviewRow[];
  confirmedRowNumbers: number[];
  summaryText: string;
};

export function StockInvoiceImportPanel({ tenantSlug }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [intent, setIntent] = useState<
    | "produtos_excel"
    | "produtos_csv"
    | "saldo_inicial"
    | "atualizar_estoque"
    | "atualizar_precos"
    | "atualizar_custos"
    | "nfe_xml"
    | "pdf_auxiliar"
  >("produtos_excel");
  const [selected, setSelected] = useState<SelectedImportFile | null>(null);
  const [preview, setPreview] = useState<StockPreview | null>(null);
  const [duplicatePolicy, setDuplicatePolicy] = useState<
    "ignore" | "update" | "duplicate_new_code"
  >("update");

  const accept =
    intent === "nfe_xml"
      ? ".xml,application/xml,text/xml"
      : intent === "pdf_auxiliar"
        ? ".pdf,application/pdf"
        : intent === "produtos_csv"
          ? ".csv,text/csv"
          : ".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv";

  const formatsHint =
    intent === "nfe_xml"
      ? `XML NF-e · máx. ${IMPORT_LIMIT_MB_CLIENT_DEFAULTS.xml} MB`
      : intent === "pdf_auxiliar"
        ? `PDF pesquisável auxiliar · máx. ${IMPORT_LIMIT_MB_CLIENT_DEFAULTS.pdf} MB · OCR requer provedor configurado (desligado)`
        : intent === "produtos_csv"
          ? `CSV · máx. ${IMPORT_LIMIT_MB_CLIENT_DEFAULTS.csv} MB`
          : `Excel/CSV · máx. ${IMPORT_LIMIT_MB_CLIENT_DEFAULTS.xlsx} MB`;

  function run(fn: () => Promise<void>) {
    setError(null);
    setInfo(null);
    startTransition(() => {
      void fn().catch((e) =>
        setError(e instanceof Error ? e.message : "Falha na operação"),
      );
    });
  }

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div>
        <h2 className="text-base font-semibold">
          Central de importação de estoque
        </h2>
        <p className="text-sm text-muted-foreground">
          Excel, CSV, saldo inicial, preços, custos, NF-e XML e PDF auxiliar.
          PDF nunca substitui o XML oficial da NF-e.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="stock-intent">O que deseja importar?</Label>
        <select
          id="stock-intent"
          className="flex h-10 max-w-xl rounded-md border bg-background px-3 text-sm"
          value={intent}
          onChange={(e) => {
            setIntent(e.target.value as typeof intent);
            setSelected(null);
            setPreview(null);
          }}
          aria-label="Tipo de importação de estoque"
        >
          <option value="produtos_excel">Importar produtos por Excel</option>
          <option value="produtos_csv">Importar produtos por CSV</option>
          <option value="saldo_inicial">Importar saldo inicial</option>
          <option value="atualizar_estoque">Atualizar estoque</option>
          <option value="atualizar_precos">Atualizar preços</option>
          <option value="atualizar_custos">Atualizar custos</option>
          <option value="nfe_xml">Importar NF-e XML</option>
          <option value="pdf_auxiliar">Importar documento PDF (auxiliar)</option>
        </select>
      </div>

      <ImportFileDropzone
        accept={accept}
        disabled={pending}
        formatsHint={formatsHint}
        selected={selected}
        onFile={(f) => {
          setSelected(f);
          setPreview(null);
        }}
      />

      <div className="space-y-2">
        <Label htmlFor="dup-stock">Em duplicidade</Label>
        <select
          id="dup-stock"
          className="flex h-10 max-w-md rounded-md border bg-background px-3 text-sm"
          value={duplicatePolicy}
          onChange={(e) =>
            setDuplicatePolicy(
              e.target.value as "ignore" | "update" | "duplicate_new_code",
            )
          }
          aria-label="Política de duplicidade estoque"
        >
          <option value="update">Atualizar existente</option>
          <option value="ignore">Ignorar</option>
          <option value="duplicate_new_code">Duplicar com novo código</option>
        </select>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={pending || !selected}
          onClick={() =>
            run(async () => {
              if (!selected) throw new Error("Selecione um arquivo.");
              const fd = new FormData();
              fd.set("file", selected.file);

              if (intent === "nfe_xml") {
                const res = await previewInvoiceXmlImportAction(tenantSlug, fd);
                setInfo(
                  `NF ${res.chaveAcesso}: ${res.summary.totalRows} itens · total ${res.summary.financialTotal ?? "—"} · ${res.alreadyExists ? "já existe" : "nova"} · baixa confiança ${res.summary.lowConfidence}.`,
                );
                if (res.redirectTo) router.push(res.redirectTo);
                return;
              }

              if (intent === "pdf_auxiliar") {
                const res = await previewPdfAssistDocumentAction(
                  tenantSlug,
                  fd,
                );
                setInfo(
                  `PDF auxiliar ${res.fileName}: ${res.pageCount} pág. · ${res.textChars} chars. ${res.notes.join(" ")}`,
                );
                return;
              }

              const res = await previewStockFileImportAction(tenantSlug, fd);
              setPreview({
                fileName: selected.name,
                format: res.format,
                mapping: res.mapping,
                reviewRows: res.reviewRows,
                confirmedRowNumbers: res.confirmedRowNumbers,
                summaryText: `Preview (${intent}): ${res.summary.totalRows} linhas · novos ${res.summary.newProducts} · duplicidades ${res.summary.duplicates} · qty ${res.summary.stockQtyTotal ?? "—"} · valor ${res.summary.stockValueTotal ?? "—"} · erros ${res.summary.errors}. Nada gravado.`,
              });
            })
          }
        >
          Preview
        </Button>
        <Button
          type="button"
          variant="destructive"
          disabled={
            pending ||
            !preview ||
            intent === "nfe_xml" ||
            intent === "pdf_auxiliar"
          }
          onClick={() => {
            if (!preview) return;
            const ok = window.confirm(
              `Confirmar importação de ${preview.fileName}? Saldo/preço/custo só gravam após esta confirmação.`,
            );
            if (!ok) return;
            run(async () => {
              const res = await commitStockFileImportAction(tenantSlug, {
                fileName: preview.fileName,
                format: preview.format,
                mapping: preview.mapping,
                rows: preview.reviewRows,
                confirmedRowNumbers: preview.confirmedRowNumbers,
                duplicatePolicy,
              });
              setInfo(
                `Importação concluída: ${res.imported} ok · ${res.rejected} rejeitados · ${res.skipped} ignorados.`,
              );
              setPreview(null);
              setSelected(null);
            });
          }}
        >
          Confirmar importação
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => {
            setSelected(null);
            setPreview(null);
            setError(null);
            setInfo(null);
            if (typeof window !== "undefined") {
              clearImportDraftEverywhere({
                sessionStorage: window.sessionStorage,
                localStorage: window.localStorage,
              });
            }
            setInfo("Importação atual limpa (rascunho apenas).");
          }}
        >
          Limpar importação atual
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => {
            setSelected(null);
            setPreview(null);
            setError(null);
            setInfo(null);
          }}
        >
          Cancelar
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/${tenantSlug}/estoque/notas-fiscais`)}
        >
          Ver notas fiscais
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/${tenantSlug}/integracoes/historico`)}
        >
          Ver histórico
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            router.push(`/${tenantSlug}/integracoes/historico?rollback=1`)
          }
        >
          Rollback (quando permitido)
        </Button>
      </div>

      {preview ? (
        <p className="text-sm text-muted-foreground" role="status">
          {preview.summaryText}
        </p>
      ) : null}
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
      {pending ? (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          Processando…
        </p>
      ) : null}
    </div>
  );
}
