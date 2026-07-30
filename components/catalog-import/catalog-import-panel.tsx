"use client";

import { useMemo, useState, useTransition } from "react";

import {
  ImportFileDropzone,
  type SelectedImportFile,
} from "@/components/catalog-import/import-file-dropzone";
import { ImportRowReviewClient } from "@/components/import-engine/import-row-review-client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  commitCatalogFileImportAction,
  commitPlatformCatalogImportAction,
  downloadProductStockTemplateAction,
  downloadServiceCatalogAction,
  previewCatalogFileImportAction,
  previewCatalogPriceBandAction,
  previewPlatformCatalogImportAction,
} from "@/lib/catalog-import/catalog-import-actions";
import {
  PRICE_BAND_LABELS,
  type PriceBandId,
} from "@/lib/catalog-import/price-bands";
import { clearImportDraftEverywhere } from "@/lib/import-engine/delete/draft-session";
import type {
  ImportColumnMapping,
  ImportReviewRow,
} from "@/lib/import-engine";
import {
  confirmedNumbersFromReview,
  fromEngineReviewRows,
  type ImportReviewLine,
} from "@/lib/import-engine/review/row-review";

type Props = {
  tenantSlug: string;
  mode: "produtos" | "estoque";
  categorias?: string[];
  complexidades?: string[];
};

type FilePreviewState = {
  kind: "servicos" | "produtos";
  fileName: string;
  format: string;
  mapping: ImportColumnMapping;
  reviewRows: ImportReviewRow[];
  confirmedRowNumbers: number[];
  summaryText: string;
  reviewLines: ImportReviewLine[];
};

function downloadBase64(fileName: string, mimeType: string, base64: string) {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  const blob = new Blob([bytes], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

function parseRate(raw: string): number {
  return Number(String(raw).replace(",", "."));
}

export function CatalogImportPanel({
  tenantSlug,
  mode,
  categorias = [],
  complexidades = [],
}: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [band, setBand] = useState<PriceBandId>("popular");
  const [prioridade, setPrioridade] = useState<"A" | "AB" | "all">("A");
  const [categoria, setCategoria] = useState<string>("");
  const [complexidade, setComplexidade] = useState<string>("");
  const [hourEconomico, setHourEconomico] = useState("110");
  const [hourPopular, setHourPopular] = useState("145");
  const [hourEstruturado, setHourEstruturado] = useState("180");
  const [hourEspecializado, setHourEspecializado] = useState("240");
  const [hourPersonalizado, setHourPersonalizado] = useState("160");
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [duplicatePolicy, setDuplicatePolicy] = useState<
    "ignore" | "update" | "duplicate_new_code"
  >("update");
  const [selectedFile, setSelectedFile] = useState<SelectedImportFile | null>(
    null,
  );
  const [fileKind, setFileKind] = useState<"servicos" | "produtos">("servicos");
  const [filePreview, setFilePreview] = useState<FilePreviewState | null>(null);

  const rates = useMemo(
    () => ({
      economico: parseRate(hourEconomico),
      popular: parseRate(hourPopular),
      estruturado: parseRate(hourEstruturado),
      especializado: parseRate(hourEspecializado),
      personalizado: parseRate(hourPersonalizado),
    }),
    [
      hourEconomico,
      hourPopular,
      hourEstruturado,
      hourEspecializado,
      hourPersonalizado,
    ],
  );

  function validateRatesClient(): string | null {
    const keys = [
      ["econômico", rates.economico],
      ["popular", rates.popular],
      ["estruturado", rates.estruturado],
      ["especializado", rates.especializado],
    ] as const;
    for (const [label, v] of keys) {
      if (!Number.isFinite(v) || v <= 0) {
        return `Hora técnica ${label} inválida. Informe um número maior que zero.`;
      }
    }
    if (band === "personalizado") {
      if (!Number.isFinite(rates.personalizado) || rates.personalizado <= 0) {
        return "Faixa personalizada exige hora técnica > 0.";
      }
    }
    return null;
  }

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
        <h2 className="text-base font-semibold">Central de importação</h2>
        <p className="text-sm text-muted-foreground">
          Selecione um arquivo do computador (XLSX, XLS ou CSV), faça preview e
          confirme. O catálogo oficial da plataforma permanece como atalho
          opcional.
        </p>
      </div>

      {mode === "produtos" ? (
        <section className="space-y-3 rounded-md border p-3">
          <h3 className="text-sm font-semibold">Upload do computador</h3>
          <div className="space-y-2">
            <Label htmlFor="file-kind">Tipo de importação</Label>
            <select
              id="file-kind"
              className="flex h-10 max-w-md rounded-md border bg-background px-3 text-sm"
              value={fileKind}
              onChange={(e) =>
                setFileKind(e.target.value as "servicos" | "produtos")
              }
              aria-label="Tipo de importação do arquivo"
            >
              <option value="servicos">Catálogo de serviços (Excel/CSV)</option>
              <option value="produtos">Produtos (Excel/CSV)</option>
            </select>
          </div>
          <ImportFileDropzone
            accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
            disabled={pending}
            formatsHint="Formatos: XLSX, XLS, CSV"
            selected={selectedFile}
            onFile={(f) => {
              setSelectedFile(f);
              setFilePreview(null);
              setPreviewText(null);
            }}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={pending || !selectedFile}
              onClick={() =>
                run(async () => {
                  if (!selectedFile) throw new Error("Selecione um arquivo.");
                  const fd = new FormData();
                  fd.set("file", selectedFile.file);
                  fd.set("kind", fileKind);
                  const res = await previewCatalogFileImportAction(
                    tenantSlug,
                    fd,
                  );
                  const reviewLines = fromEngineReviewRows(res.reviewRows).map(
                    (l) => ({
                      ...l,
                      selected: res.confirmedRowNumbers.includes(l.rowNumber),
                    }),
                  );
                  setFilePreview({
                    kind: res.kind,
                    fileName: res.fileMeta.name,
                    format: res.format,
                    mapping: res.mapping,
                    reviewRows: res.reviewRows,
                    confirmedRowNumbers: res.confirmedRowNumbers,
                    summaryText: `Preview: ${res.summary.totalRows} linhas · novos ${res.summary.newServices || res.summary.newProducts || 0} · duplicidades ${res.summary.duplicates} · erros ${res.summary.errors} · total ${res.summary.financialTotal ?? "—"} (nada gravado).`,
                    reviewLines,
                  });
                  setPreviewText(
                    `Arquivo ${res.fileMeta.name} (${res.fileMeta.format}) validado.`,
                  );
                })
              }
            >
              Preview do arquivo
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={pending || !filePreview}
              onClick={() => {
                if (!filePreview) return;
                const ok = window.confirm(
                  `Confirmar importação de ${filePreview.fileName}? Nenhuma gravação ocorre sem esta confirmação.`,
                );
                if (!ok) return;
                run(async () => {
                  const confirmed = confirmedNumbersFromReview(
                    filePreview.reviewLines,
                  );
                  const res = await commitCatalogFileImportAction(tenantSlug, {
                    kind: filePreview.kind,
                    fileName: filePreview.fileName,
                    format: filePreview.format,
                    mapping: filePreview.mapping,
                    rows: filePreview.reviewRows,
                    confirmedRowNumbers: confirmed,
                    duplicatePolicy,
                    confirmed: true,
                  });
                  setInfo(
                    `Importação concluída: ${res.imported} ok · ${res.rejected} rejeitados · ${res.skipped} ignorados.`,
                  );
                  setFilePreview(null);
                  setSelectedFile(null);
                });
              }}
            >
              Confirmar importação do arquivo
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => {
                setSelectedFile(null);
                setFilePreview(null);
                setPreviewText(null);
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
                setSelectedFile(null);
                setFilePreview(null);
                setPreviewText(null);
                setError(null);
                setInfo(null);
              }}
            >
              Cancelar
            </Button>
          </div>
          {filePreview ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground" role="status">
                {filePreview.summaryText}
              </p>
              <ImportRowReviewClient
                lines={filePreview.reviewLines}
                onChange={(reviewLines) =>
                  setFilePreview((prev) =>
                    prev
                      ? {
                          ...prev,
                          reviewLines,
                          confirmedRowNumbers: reviewLines
                            .filter((l) => l.selected && l.action !== "ignore")
                            .map((l) => l.rowNumber),
                        }
                      : prev,
                  )
                }
              />
            </div>
          ) : null}
        </section>
      ) : null}

      {mode === "produtos" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="band">Faixa de preço</Label>
            <select
              id="band"
              className="flex h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={band}
              onChange={(e) => setBand(e.target.value as PriceBandId)}
              aria-label="Faixa de preço"
            >
              {(Object.keys(PRICE_BAND_LABELS) as PriceBandId[]).map((k) => (
                <option key={k} value={k}>
                  {PRICE_BAND_LABELS[k]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="prio">Prioridade</Label>
            <select
              id="prio"
              className="flex h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={prioridade}
              onChange={(e) =>
                setPrioridade(e.target.value as "A" | "AB" | "all")
              }
              aria-label="Prioridade comercial"
            >
              <option value="A">Prioridade A</option>
              <option value="AB">Prioridade A + B</option>
              <option value="all">Catálogo completo</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cat">Categoria</Label>
            <select
              id="cat"
              className="flex h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              aria-label="Filtrar por categoria"
            >
              <option value="">Todas</option>
              {categorias.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cx">Complexidade</Label>
            <select
              id="cx"
              className="flex h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={complexidade}
              onChange={(e) => setComplexidade(e.target.value)}
              aria-label="Filtrar por complexidade"
            >
              <option value="">Todas</option>
              {complexidades.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}

      {mode === "produtos" ? (
        <div className="grid gap-2 sm:grid-cols-5">
          <label className="text-xs">
            Econômico R$/h
            <input
              className="mt-1 flex h-9 w-full rounded-md border px-2 text-sm"
              value={hourEconomico}
              onChange={(e) => setHourEconomico(e.target.value)}
              aria-label="Hora técnica econômica"
              inputMode="decimal"
            />
          </label>
          <label className="text-xs">
            Popular R$/h
            <input
              className="mt-1 flex h-9 w-full rounded-md border px-2 text-sm"
              value={hourPopular}
              onChange={(e) => setHourPopular(e.target.value)}
              aria-label="Hora técnica popular"
              inputMode="decimal"
            />
          </label>
          <label className="text-xs">
            Estruturado R$/h
            <input
              className="mt-1 flex h-9 w-full rounded-md border px-2 text-sm"
              value={hourEstruturado}
              onChange={(e) => setHourEstruturado(e.target.value)}
              aria-label="Hora técnica estruturada"
              inputMode="decimal"
            />
          </label>
          <label className="text-xs">
            Especializado R$/h
            <input
              className="mt-1 flex h-9 w-full rounded-md border px-2 text-sm"
              value={hourEspecializado}
              onChange={(e) => setHourEspecializado(e.target.value)}
              aria-label="Hora técnica especializada"
              inputMode="decimal"
            />
          </label>
          <label className="text-xs">
            Personalizado R$/h
            <input
              className="mt-1 flex h-9 w-full rounded-md border px-2 text-sm"
              value={hourPersonalizado}
              onChange={(e) => setHourPersonalizado(e.target.value)}
              aria-label="Hora técnica personalizada"
              inputMode="decimal"
              disabled={band !== "personalizado"}
            />
          </label>
        </div>
      ) : null}

      {mode === "produtos" ? (
        <div className="space-y-2">
          <Label htmlFor="dup">Em duplicidade</Label>
          <select
            id="dup"
            className="flex h-10 max-w-md rounded-md border bg-background px-3 text-sm"
            value={duplicatePolicy}
            onChange={(e) =>
              setDuplicatePolicy(
                e.target.value as "ignore" | "update" | "duplicate_new_code",
              )
            }
            aria-label="Política de duplicidade"
          >
            <option value="update">Atualizar existente</option>
            <option value="ignore">Ignorar</option>
            <option value="duplicate_new_code">Duplicar com novo código</option>
          </select>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {mode === "produtos" ? (
          <>
            <Button
              type="button"
              disabled={pending}
              onClick={() =>
                run(async () => {
                  const invalid = validateRatesClient();
                  if (invalid) throw new Error(invalid);
                  const res = await downloadServiceCatalogAction(tenantSlug, {
                    format: "xlsx",
                    band,
                    prioridade,
                    categoria: categoria || null,
                    complexidade: complexidade || null,
                    rates,
                  });
                  downloadBase64(res.fileName, res.mimeType, res.base64);
                  setInfo(`Catálogo baixado (${res.rowCount} linhas).`);
                })
              }
            >
              Baixar catálogo de serviços
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() =>
                run(async () => {
                  const invalid = validateRatesClient();
                  if (invalid) throw new Error(invalid);
                  const res = await downloadServiceCatalogAction(tenantSlug, {
                    format: "csv",
                    band,
                    prioridade,
                    categoria: categoria || null,
                    complexidade: complexidade || null,
                    rates,
                  });
                  downloadBase64(res.fileName, res.mimeType, res.base64);
                  setInfo("CSV do catálogo baixado.");
                })
              }
            >
              Baixar CSV
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() =>
                run(async () => {
                  const res = await downloadServiceCatalogAction(tenantSlug, {
                    format: "xlsx",
                    emptyTemplate: true,
                    band,
                    rates,
                  });
                  downloadBase64(res.fileName, res.mimeType, res.base64);
                  setInfo("Modelo vazio baixado.");
                })
              }
            >
              Modelo vazio
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() =>
                run(async () => {
                  const invalid = validateRatesClient();
                  if (invalid) throw new Error(invalid);
                  const recalc = await previewCatalogPriceBandAction(
                    tenantSlug,
                    { band, rates, prioridade },
                  );
                  const preview = await previewPlatformCatalogImportAction(
                    tenantSlug,
                    { band, rates, prioridade },
                  );
                  setPreviewText(
                    `Catálogo plataforma · Faixa ${PRICE_BAND_LABELS[band]} @ ${recalc.hourRateLabel} · ${recalc.affectedCount} serviços · duplicidades ${preview.summary.duplicates} · total ${preview.summary.financialTotal ?? "—"} (nada gravado).`,
                  );
                })
              }
            >
              Preview catálogo plataforma
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={pending}
              onClick={() => {
                const ok = window.confirm(
                  "Confirmar importação do catálogo oficial da plataforma? Nenhum preço será gravado sem esta confirmação. Serviços não movimentam estoque.",
                );
                if (!ok) return;
                run(async () => {
                  const invalid = validateRatesClient();
                  if (invalid) throw new Error(invalid);
                  const res = await commitPlatformCatalogImportAction(
                    tenantSlug,
                    {
                      band,
                      rates,
                      prioridade,
                      confirmed: true,
                      duplicatePolicy,
                    },
                  );
                  setInfo(
                    `Importação plataforma: ${res.imported} ok · ${res.rejected} rejeitados · ${res.skipped} ignorados.`,
                  );
                });
              }}
            >
              Importar catálogo oficial (confirmar)
            </Button>
          </>
        ) : null}

        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() =>
            run(async () => {
              const res = await downloadProductStockTemplateAction(
                tenantSlug,
                "xlsx",
              );
              downloadBase64(res.fileName, res.mimeType, res.base64);
              setInfo("Modelo de produtos/estoque baixado.");
            })
          }
        >
          Baixar modelo de produtos e estoque
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() =>
            run(async () => {
              const res = await downloadProductStockTemplateAction(
                tenantSlug,
                "csv",
              );
              downloadBase64(res.fileName, res.mimeType, res.base64);
              setInfo("Modelo CSV de produtos/estoque baixado.");
            })
          }
        >
          Modelo CSV produtos
        </Button>
      </div>

      {previewText ? (
        <p className="text-sm text-muted-foreground" role="status">
          {previewText}
        </p>
      ) : null}
      {info ? (
        <p className="text-sm text-foreground" role="status">
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
