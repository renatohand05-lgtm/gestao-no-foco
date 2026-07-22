"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { FeedbackMessage } from "@/components/ui/feedback-message";
import { buttonVariants } from "@/components/ui/button";
import { vincularOsRecursoAction } from "@/lib/operacoes/recursos-actions";
import type { OficinaRecurso } from "@/lib/operacoes/recursos-service";
import { cn } from "@/lib/utils";

type Props = {
  tenantSlug: string;
  osId: string;
  recursoId: string | null;
  recursoNome: string | null;
  recursos: OficinaRecurso[];
  canEdit: boolean;
};

export function OsRecursoBinder({
  tenantSlug,
  osId,
  recursoId,
  recursoNome,
  recursos,
  canEdit,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState(recursoId ?? "");
  const [error, setError] = useState<string | null>(null);

  if (!canEdit && !recursoId) {
    return (
      <p className="text-xs text-muted-foreground">Sem recurso vinculado.</p>
    );
  }

  function bind(modo: "ocupar" | "reservar" | "liberar") {
    setError(null);
    startTransition(async () => {
      const result = await vincularOsRecursoAction(
        tenantSlug,
        osId,
        modo === "liberar" ? null : selected || null,
        modo,
      );
      if (!result.success) {
        setError(result.error ?? "Falha ao vincular.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg border bg-card p-3 space-y-2">
      <p className="text-xs font-medium text-muted-foreground">
        Elevador / recurso
      </p>
      {recursoNome ? (
        <p className="text-sm font-medium">{recursoNome}</p>
      ) : (
        <p className="text-sm text-muted-foreground">Nenhum recurso</p>
      )}
      {error ? <FeedbackMessage variant="error">{error}</FeedbackMessage> : null}
      {canEdit ? (
        <div className="flex flex-wrap items-end gap-2">
          <select
            className="h-9 min-w-40 rounded-md border border-input bg-transparent px-2 text-sm"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="">Selecionar…</option>
            {recursos.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nome} ({r.tipo}) — {r.status}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={pending || !selected}
            className={cn(buttonVariants({ size: "sm" }))}
            onClick={() => bind("ocupar")}
          >
            Ocupar
          </button>
          <button
            type="button"
            disabled={pending || !selected}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            onClick={() => bind("reservar")}
          >
            Reservar
          </button>
          <button
            type="button"
            disabled={pending || !recursoId}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            onClick={() => bind("liberar")}
          >
            Liberar
          </button>
        </div>
      ) : null}
    </div>
  );
}
