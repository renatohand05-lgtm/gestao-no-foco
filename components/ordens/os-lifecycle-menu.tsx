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
  canRestaurar: boolean;
  compact?: boolean;
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
  canRestaurar,
  compact = false,
}: Props) {
  const [mode, setMode] = useState<OsLifecycleMode | null>(null);

  const isRascunho = status === "rascunho";
  const isArquivada = Boolean(arquivadoEm);
  const isCancelada = status === "cancelado" || status === "cancelada";
  const isFaturada = status === "faturado" || Boolean(vendaId);

  const size = compact ? "sm" : "default";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {canCancel && !isCancelada && !isFaturada && !isArquivada ? (
          <button
            type="button"
            className={cn(buttonVariants({ variant: "destructive", size }))}
            onClick={() => setMode("cancelar")}
          >
            Cancelar OS
          </button>
        ) : null}
        {canArquivar && !isArquivada && !isRascunho ? (
          <button
            type="button"
            className={cn(buttonVariants({ variant: "outline", size }))}
            onClick={() => setMode("arquivar")}
          >
            Arquivar
          </button>
        ) : null}
        {canExcluirRascunho && isRascunho ? (
          <button
            type="button"
            className={cn(buttonVariants({ variant: "destructive", size }))}
            onClick={() => setMode("excluir")}
          >
            Excluir rascunho
          </button>
        ) : null}
        {canRestaurar && isArquivada ? (
          <button
            type="button"
            className={cn(buttonVariants({ size }))}
            onClick={() => setMode("restaurar")}
          >
            Restaurar
          </button>
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
        onClose={() => setMode(null)}
      />
    </div>
  );
}
