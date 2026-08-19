"use client";

import { useState } from "react";

import {
  OsConfirmDialog,
  type OsLifecycleMode,
} from "@/components/ordens/os-confirm-dialog";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  tenantSlug: string;
  osId: string;
  numero: number;
  clienteNome: string | null;
  placa: string | null;
  modelo: string | null;
  status: string;
  vendaId: string | null;
  arquivadoEm: string | null;
  canCancel: boolean;
  canArquivar: boolean;
  canExcluirRascunho: boolean;
  canExcluirPermanente?: boolean;
  canRestaurar: boolean;
  compact?: boolean;
  cancelLabel?: string;
};

export function OsLifecycleMenu({
  tenantSlug,
  osId,
  numero,
  clienteNome,
  placa,
  modelo,
  status,
  vendaId,
  arquivadoEm,
  canCancel,
  canArquivar,
  canExcluirRascunho,
  canExcluirPermanente = false,
  canRestaurar,
  compact = false,
  cancelLabel = "Cancelar OS",
}: Props) {
  const [mode, setMode] = useState<OsLifecycleMode | null>(null);
  const [open, setOpen] = useState(false);

  const isRascunho = status === "rascunho";
  const isArquivada = Boolean(arquivadoEm);
  const isCancelada = status === "cancelado" || status === "cancelada";
  const isFaturada = status === "faturado" || Boolean(vendaId);
  const showCancel = canCancel && !isCancelada && !isFaturada && !isArquivada;
  const showExcluirRascunho = canExcluirRascunho && isRascunho;
  const showExcluirPermanente =
    canExcluirPermanente && !isFaturada && !isRascunho;
  const hasMenu =
    showCancel ||
    (canArquivar && !isArquivada && !isRascunho) ||
    showExcluirRascunho ||
    showExcluirPermanente ||
    (canRestaurar && isArquivada);

  if (!hasMenu) return null;

  const size = compact ? "sm" : "default";

  return (
    <div className="space-y-2">
      <div className="relative inline-block">
        <button
          type="button"
          className={cn(buttonVariants({ variant: "outline", size }))}
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          ⋯
        </button>
        {open ? (
          <div
            role="menu"
            className="absolute right-0 z-20 mt-1 min-w-56 rounded-md border bg-background p-1 shadow-md"
          >
            {showCancel ? (
              <button
                type="button"
                role="menuitem"
                className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-muted"
                onClick={() => {
                  setOpen(false);
                  setMode("cancelar");
                }}
              >
                {cancelLabel}
              </button>
            ) : null}
            {canArquivar && !isArquivada && !isRascunho ? (
              <button
                type="button"
                role="menuitem"
                className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-muted"
                onClick={() => {
                  setOpen(false);
                  setMode("arquivar");
                }}
              >
                Arquivar
              </button>
            ) : null}
            {showExcluirRascunho ? (
              <button
                type="button"
                role="menuitem"
                className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-muted"
                onClick={() => {
                  setOpen(false);
                  setMode("excluir");
                }}
              >
                Excluir rascunho
              </button>
            ) : null}
            {showExcluirPermanente ? (
              <button
                type="button"
                role="menuitem"
                className="block w-full rounded px-3 py-2 text-left text-sm text-destructive hover:bg-muted"
                onClick={() => {
                  setOpen(false);
                  setMode("excluir_permanente");
                }}
              >
                Excluir permanentemente
              </button>
            ) : null}
            {canRestaurar && isArquivada ? (
              <button
                type="button"
                role="menuitem"
                className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-muted"
                onClick={() => {
                  setOpen(false);
                  setMode("restaurar");
                }}
              >
                Restaurar
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <OsConfirmDialog
        tenantSlug={tenantSlug}
        osId={osId}
        numero={numero}
        clienteNome={clienteNome}
        placa={placa}
        modelo={modelo}
        status={status}
        vendaId={vendaId}
        open={mode != null}
        mode={mode}
        cancelLabel={cancelLabel}
        onClose={() => setMode(null)}
      />
    </div>
  );
}
