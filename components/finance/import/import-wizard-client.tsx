"use client";

import { useMemo, useState, useTransition } from "react";

import { ImportHistoryTable } from "@/components/finance/import/import-history-table";
import { ImportUploadZone } from "@/components/finance/import/import-upload-zone";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  buildFinanceImportReview,
  commitFinanceImport,
  patchFinanceImportReviewRow,
  previewFinanceImport,
  updateFinanceImportMapping,
} from "@/lib/finance/import/import-actions";
import type { BankAccount } from "@/lib/finance";
import type {
  ImportFieldDef,
  ImportHistoryEntry,
  ImportPreview,
  ImportReviewRow,
} from "@/lib/import-engine";
import { cn } from "@/lib/utils";

type Step = "upload" | "preview" | "mapping" | "review" | "done";

type Props = {
  tenantSlug: string;
  accounts: BankAccount[];
  initialHistory: ImportHistoryEntry[];
};

export function ImportWizardClient({
  tenantSlug,
  accounts,
  initialHistory,
}: Props) {
  const [step, setStep] = useState<Step>("upload");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [targetFields, setTargetFields] = useState<ImportFieldDef[]>([]);
  const [mapping, setMapping] = useState<Record<string, string | null>>({});
  const [review, setReview] = useState<ImportReviewRow[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bankAccountId, setBankAccountId] = useState(
    accounts.find((a) => a.status === "active")?.id ?? "",
  );
  const [history, setHistory] = useState(initialHistory);
  const [commitSummary, setCommitSummary] = useState<string | null>(null);

  const activeAccounts = useMemo(
    () => accounts.filter((a) => a.status === "active"),
    [accounts],
  );

  function upload(file: File) {
    setError(null);
    const fd = new FormData();
    fd.set("file", file);
    startTransition(async () => {
      const res = await previewFinanceImport(tenantSlug, fd);
      if (!res.success) {
        setError(res.error);
        return;
      }
      setSessionId(res.sessionId);
      setPreview(res.preview);
      setTargetFields(res.targetFields);
      setMapping(res.preview.mapping);
      setStep("preview");
    });
  }

  function saveMapping() {
    if (!sessionId) return;
    setError(null);
    startTransition(async () => {
      const res = await updateFinanceImportMapping(
        tenantSlug,
        sessionId,
        mapping,
        true,
      );
      if (!res.success) {
        setError(res.error);
        return;
      }
      setPreview(res.preview);
      setStep("mapping");
    });
  }

  function goReview() {
    if (!sessionId) return;
    setError(null);
    startTransition(async () => {
      const mapRes = await updateFinanceImportMapping(
        tenantSlug,
        sessionId,
        mapping,
        true,
      );
      if (!mapRes.success) {
        setError(mapRes.error);
        return;
      }
      const res = await buildFinanceImportReview(tenantSlug, sessionId);
      if (!res.success) {
        setError(res.error);
        return;
      }
      setReview(res.review);
      const autoSelect = new Set(
        res.review
          .filter(
            (r) =>
              !r.issues.some((i) => i.severity === "error") &&
              (r.classification.status === "auto" ||
                r.classification.status === "confirmed" ||
                r.classification.status === "edited"),
          )
          .map((r) => r.rowNumber),
      );
      setSelected(autoSelect);
      setStep("review");
    });
  }

  function toggleRow(n: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  }

  function confirmRow(rowNumber: number) {
    if (!sessionId) return;
    startTransition(async () => {
      const res = await patchFinanceImportReviewRow(
        tenantSlug,
        sessionId,
        rowNumber,
        { status: "confirmed" },
      );
      if (!res.success) {
        setError(res.error);
        return;
      }
      setReview((rows) =>
        rows.map((r) => (r.rowNumber === rowNumber ? res.row : r)),
      );
      setSelected((prev) => new Set(prev).add(rowNumber));
    });
  }

  function editCategory(rowNumber: number, category: string) {
    if (!sessionId) return;
    startTransition(async () => {
      const res = await patchFinanceImportReviewRow(
        tenantSlug,
        sessionId,
        rowNumber,
        { categorySuggested: category, status: "edited" },
      );
      if (!res.success) {
        setError(res.error);
        return;
      }
      setReview((rows) =>
        rows.map((r) => (r.rowNumber === rowNumber ? res.row : r)),
      );
    });
  }

  function commit() {
    if (!sessionId) return;
    setError(null);
    startTransition(async () => {
      const res = await commitFinanceImport(tenantSlug, {
        sessionId,
        bankAccountId,
        confirmedRowNumbers: [...selected],
      });
      if (!res.success) {
        setError(res.error);
        return;
      }
      setCommitSummary(
        `Importadas ${res.result.imported} · rejeitadas ${res.result.rejected} · ignoradas ${res.result.skipped} · ${res.result.durationMs} ms`,
      );
      setHistory((h) => [
        {
          id: res.result.logId,
          tenantId: "",
          userId: "",
          userLabel: "você",
          module: "financeiro",
          fileName: preview?.fileName ?? "arquivo",
          format: preview?.format ?? "csv",
          status:
            res.result.rejected > 0 && res.result.imported > 0
              ? "partial"
              : res.result.imported > 0
                ? "completed"
                : "failed",
          totalRows: review.length,
          importedRows: res.result.imported,
          rejectedRows: res.result.rejected,
          errorCount: res.result.errors.length,
          durationMs: res.result.durationMs,
          createdAt: new Date().toISOString(),
          errorsSample: res.result.errors.slice(0, 3).map((e) => e.message),
        },
        ...h,
      ]);
      setStep("done");
    });
  }

  function reset() {
    setStep("upload");
    setSessionId(null);
    setPreview(null);
    setReview([]);
    setSelected(new Set());
    setError(null);
    setCommitSummary(null);
  }

  return (
    <div className="space-y-6" data-import-wizard data-step={step}>
      {error ? (
        <p
          className="rounded-lg border border-red-500/40 px-3 py-2 text-sm text-red-700"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        {(
          [
            ["upload", "1. Upload"],
            ["preview", "2. Pré-visualização"],
            ["mapping", "3. Mapeamento"],
            ["review", "4. Revisão"],
            ["done", "5. Concluído"],
          ] as const
        ).map(([key, label]) => (
          <span
            key={key}
            className={cn(
              "rounded-full px-2.5 py-1",
              step === key
                ? "bg-[var(--brand-graphite)] text-white"
                : "bg-muted",
            )}
          >
            {label}
          </span>
        ))}
      </div>

      {step === "upload" ? (
        <Card>
          <CardHeader>
            <CardTitle>Enviar arquivo</CardTitle>
            <CardDescription>
              Excel (.xlsx / .xls) ou CSV. Nada é gravado até a confirmação final.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ImportUploadZone disabled={pending} onFile={upload} />
          </CardContent>
        </Card>
      ) : null}

      {preview && (step === "preview" || step === "mapping") ? (
        <Card>
          <CardHeader>
            <CardTitle>Pré-visualização</CardTitle>
            <CardDescription>
              {preview.fileName} · {preview.totalRows} linhas · formato{" "}
              {preview.format}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {preview.warnings.length ? (
              <ul className="list-inside list-disc text-xs text-amber-800">
                {preview.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            ) : null}
            {preview.issues.length ? (
              <ul className="list-inside list-disc text-xs text-red-700">
                {preview.issues.map((i) => (
                  <li key={`${i.code}-${i.field}`}>{i.message}</li>
                ))}
              </ul>
            ) : null}

            <div className="flex flex-wrap gap-2">
              {preview.columns.map((c) => (
                <Badge key={c.key} variant="outline">
                  {c.label}
                </Badge>
              ))}
            </div>
            {preview.unknownColumns.length ? (
              <p className="text-xs text-muted-foreground">
                Colunas sem mapeamento: {preview.unknownColumns.join(", ")}
              </p>
            ) : null}

            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {preview.columns.map((c) => (
                      <TableHead key={c.key}>{c.label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...preview.firstRows, ...preview.lastRows].map((row, i) => (
                    <TableRow key={i}>
                      {preview.columns.map((c) => (
                        <TableCell key={c.key} className="max-w-[160px] truncate text-xs">
                          {String(row[c.key] ?? "")}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="space-y-3 rounded-lg border border-border/50 p-3">
              <p className="text-sm font-medium">Mapeamento de colunas</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {targetFields.map((field) => (
                  <label key={field.key} className="block space-y-1 text-sm">
                    <span className="text-muted-foreground">
                      {field.label}
                      {field.required ? " *" : ""}
                    </span>
                    <select
                      className="w-full rounded-md border border-input bg-transparent px-3 py-2"
                      value={mapping[field.key] ?? ""}
                      onChange={(e) =>
                        setMapping((m) => ({
                          ...m,
                          [field.key]: e.target.value || null,
                        }))
                      }
                    >
                      <option value="">— não mapear —</option>
                      {preview.columns.map((c) => (
                        <option key={c.key} value={c.key}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={saveMapping}
                >
                  Guardar mapeamento
                </Button>
                <Button type="button" disabled={pending} onClick={goReview}>
                  Continuar para revisão
                </Button>
                <Button type="button" variant="ghost" onClick={reset}>
                  Cancelar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === "review" ? (
        <Card>
          <CardHeader>
            <CardTitle>Revisão e classificação</CardTitle>
            <CardDescription>
              Confirme as linhas. Baixa confiança aparece destacada. Categorias
              existentes são associadas — nada é criado em silêncio.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="block max-w-md space-y-1 text-sm">
              <span className="text-muted-foreground">Conta bancária destino *</span>
              <select
                required
                className="w-full rounded-md border border-input bg-transparent px-3 py-2"
                value={bankAccountId}
                onChange={(e) => setBankAccountId(e.target.value)}
              >
                <option value="">Selecione…</option>
                {activeAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead />
                    <TableHead>Linha</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria sugerida</TableHead>
                    <TableHead>Confiança</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {review.map((r) => {
                    const low =
                      r.classification.status === "low_confidence" ||
                      r.classification.status === "unclassified";
                    const hasErr = r.issues.some((i) => i.severity === "error");
                    return (
                      <TableRow
                        key={r.rowNumber}
                        className={cn(
                          low && "bg-amber-50/80",
                          hasErr && "bg-red-50/70",
                        )}
                        data-low-confidence={low ? "true" : "false"}
                      >
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selected.has(r.rowNumber)}
                            disabled={hasErr}
                            onChange={() => toggleRow(r.rowNumber)}
                            aria-label={`Selecionar linha ${r.rowNumber}`}
                          />
                        </TableCell>
                        <TableCell className="tabular-nums">{r.rowNumber}</TableCell>
                        <TableCell className="max-w-[240px] truncate text-sm">
                          {r.description}
                        </TableCell>
                        <TableCell>
                          <input
                            className="w-full min-w-[140px] rounded-md border border-input bg-transparent px-2 py-1 text-xs"
                            defaultValue={
                              r.classification.categorySuggested ?? ""
                            }
                            onBlur={(e) => {
                              if (
                                e.target.value !==
                                (r.classification.categorySuggested ?? "")
                              ) {
                                editCategory(r.rowNumber, e.target.value);
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell className="tabular-nums text-xs">
                          {Math.round(r.classification.confidence * 100)}%
                        </TableCell>
                        <TableCell>
                          <Badge variant={low ? "warning" : "outline"}>
                            {r.classification.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={hasErr || pending}
                            onClick={() => confirmRow(r.rowNumber)}
                          >
                            Confirmar
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={pending || !bankAccountId || selected.size === 0}
                onClick={commit}
              >
                Importar {selected.size} linha(s)
              </Button>
              <Button type="button" variant="ghost" onClick={reset}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === "done" ? (
        <Card>
          <CardHeader>
            <CardTitle>Importação concluída</CardTitle>
            <CardDescription>{commitSummary}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button type="button" onClick={reset}>
              Nova importação
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Histórico de importações</CardTitle>
          <CardDescription>
            Últimas importações deste tenant (sessão do servidor — Fase 1).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ImportHistoryTable history={history} />
        </CardContent>
      </Card>
    </div>
  );
}
