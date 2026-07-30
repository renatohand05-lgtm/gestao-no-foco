"use client";

/**
 * Sprint 25.4.2 — Menu de ações do histórico + modal de impacto.
 */

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  archiveImportHistoryAction,
  downloadImportRunReportAction,
  executeImportUndoAction,
  previewImportUndoAction,
  softDeleteImportHistoryAction,
} from "@/lib/import-engine/delete/import-history-actions";
import type { ImportHistoryEntry } from "@/lib/import-engine";
import type { ImportUndoImpactPreview } from "@/lib/import-engine/delete/preview";

type Props = {
  tenantSlug: string;
  run: ImportHistoryEntry;
  canRollback: boolean;
  onChanged: (run: ImportHistoryEntry) => void;
  onInspect: () => void;
  onRetry?: () => void;
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

export function ImportHistoryRowActions({
  tenantSlug,
  run,
  canRollback,
  onChanged,
  onInspect,
  onRetry,
}: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportUndoImpactPreview | null>(null);
  const [reason, setReason] = useState("");
  const [typed, setTyped] = useState("");
  const [mode, setMode] = useState<"undo" | "archive" | "soft_delete" | null>(
    null,
  );

  function runAction(fn: () => Promise<void>) {
    setError(null);
    startTransition(() => {
      void fn().catch((e) =>
        setError(e instanceof Error ? e.message : "Falha"),
      );
    });
  }

  const alreadyUndone = run.status === "rolled_back";
  const archived = Boolean(run.archivedAt);
  const deleted = Boolean(run.deletedAt);

  return (
    <div className="relative flex flex-wrap items-center gap-1">
      <Button type="button" size="sm" variant="secondary" onClick={onInspect}>
        Ver detalhes
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        Ações
      </Button>
      {open ? (
        <div
          className="absolute right-0 top-full z-20 mt-1 min-w-[220px] rounded-md border bg-background p-2 shadow-md"
          role="menu"
        >
          <button
            type="button"
            className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
            disabled={pending || alreadyUndone || deleted || !canRollback}
            onClick={() =>
              runAction(async () => {
                const res = await previewImportUndoAction(tenantSlug, run.id);
                if (!res.success) throw new Error(res.error);
                setPreview(res.preview);
                setMode("undo");
                setOpen(false);
              })
            }
          >
            Desfazer importação
          </button>
          <button
            type="button"
            className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
            disabled={pending || archived || deleted}
            onClick={() => {
              setMode("archive");
              setPreview(null);
              setOpen(false);
            }}
          >
            Arquivar histórico
          </button>
          <button
            type="button"
            className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
            disabled={pending || deleted}
            onClick={() => {
              setMode("soft_delete");
              setPreview(null);
              setOpen(false);
            }}
          >
            Excluir do histórico
          </button>
          <button
            type="button"
            className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
            disabled={pending}
            onClick={() =>
              runAction(async () => {
                const res = await downloadImportRunReportAction(
                  tenantSlug,
                  run.id,
                );
                if (!res.success) throw new Error(res.error);
                downloadBase64(res.fileName, res.mimeType, res.base64);
                setOpen(false);
              })
            }
          >
            Baixar relatório
          </button>
          {onRetry && (run.status === "failed" || run.status === "partial") ? (
            <button
              type="button"
              className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
              onClick={() => {
                onRetry();
                setOpen(false);
              }}
            >
              Tentar novamente
            </button>
          ) : null}
        </div>
      ) : null}

      {mode ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Confirmar ação de importação"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border bg-background p-4 shadow-lg">
            <h3 className="text-base font-semibold">
              {mode === "undo"
                ? "Desfazer importação"
                : mode === "archive"
                  ? "Arquivar histórico"
                  : "Excluir do histórico"}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {mode === "undo"
                ? "Esta ação pode alterar estoque e lançamentos financeiros. Revise o impacto antes de continuar."
                : mode === "archive"
                  ? "Oculta da visão padrão. Auditoria e dados operacionais são preservados."
                  : "Remove apenas da lista principal (soft-delete). Não apaga dados criados pela importação."}
            </p>

            {preview ? (
              <div className="mt-3 space-y-1 rounded-md border p-3 text-sm">
                <div>
                  Status: <strong>{preview.summary.status}</strong>
                </div>
                <div>Elegíveis: {preview.summary.eligibleCount}</div>
                <div>Bloqueados: {preview.summary.blockedCount}</div>
                <div>Produtos a remover: {preview.productsToRemove.length}</div>
                <div>Serviços a remover: {preview.servicesToRemove.length}</div>
                <div>
                  Movimentações a reverter: {preview.movementsToReverse.length}
                </div>
                <div>{preview.stockImpactNote}</div>
                <div>{preview.financialImpactNote}</div>
                {preview.blockedItems.slice(0, 5).map((b) => (
                  <div key={b.targetId} className="text-xs text-destructive">
                    Bloqueado {b.targetType}:{b.targetId.slice(0, 8)} —{" "}
                    {b.blockReasons.join(", ")}
                    {b.action === "inactivate" ? " (pode inativar)" : ""}
                  </div>
                ))}
              </div>
            ) : null}

            <div className="mt-3 space-y-2">
              <Label htmlFor={`reason-${run.id}`}>Motivo</Label>
              <textarea
                id={`reason-${run.id}`}
                className="min-h-[70px] w-full rounded-md border px-3 py-2 text-sm"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                aria-label="Motivo da ação"
              />
              {(mode === "soft_delete" ||
                preview?.summary.requiresTypedConfirmation) && (
                <>
                  <Label htmlFor={`typed-${run.id}`}>
                    Digite EXCLUIR para confirmar
                  </Label>
                  <input
                    id={`typed-${run.id}`}
                    className="flex h-10 w-full rounded-md border px-3 text-sm"
                    value={typed}
                    onChange={(e) => setTyped(e.target.value)}
                    aria-label="Confirmação EXCLUIR"
                  />
                </>
              )}
            </div>

            {error ? (
              <p className="mt-2 text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => {
                  setMode(null);
                  setPreview(null);
                  setReason("");
                  setTyped("");
                }}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={pending}
                onClick={() =>
                  runAction(async () => {
                    if (mode === "undo") {
                      const res = await executeImportUndoAction(tenantSlug, {
                        runId: run.id,
                        mode: "all_eligible",
                        reason,
                        typedConfirmation: typed,
                        confirmed: true,
                      });
                      if (!res.success) throw new Error(res.error);
                      onChanged({
                        ...run,
                        status: "rolled_back",
                        rolledBackAt: new Date().toISOString(),
                      });
                    } else if (mode === "archive") {
                      const res = await archiveImportHistoryAction(tenantSlug, {
                        runId: run.id,
                        reason,
                      });
                      if (!res.success) throw new Error(res.error);
                      onChanged(res.entry);
                    } else if (mode === "soft_delete") {
                      const res = await softDeleteImportHistoryAction(
                        tenantSlug,
                        {
                          runId: run.id,
                          reason,
                          typedConfirmation: typed,
                        },
                      );
                      if (!res.success) throw new Error(res.error);
                      onChanged(res.entry);
                    }
                    setMode(null);
                    setPreview(null);
                    setReason("");
                    setTyped("");
                  })
                }
              >
                Confirmar
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
