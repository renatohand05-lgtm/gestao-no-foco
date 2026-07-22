"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { Input } from "@/components/ui/input";
import {
  arquivarOsAction,
  cancelarOsAction,
  excluirRascunhoOsAction,
  restaurarOsAction,
} from "@/lib/ordens/actions";
import { OS_STATUS_LABELS, type OsStatus } from "@/lib/ordens/os-status";
import { cn } from "@/lib/utils";

export type OsLifecycleMode =
  | "cancelar"
  | "arquivar"
  | "excluir"
  | "restaurar";

type Props = {
  tenantSlug: string;
  osId: string;
  numero: number;
  clienteNome: string | null;
  placa: string | null;
  modelo: string | null;
  status: string;
  vendaId: string | null;
  open: boolean;
  mode: OsLifecycleMode | null;
  onClose: () => void;
};

const TITLES: Record<OsLifecycleMode, string> = {
  cancelar: "Cancelar OS",
  arquivar: "Arquivar OS",
  excluir: "Excluir rascunho",
  restaurar: "Restaurar OS",
};

export function OsConfirmDialog({
  tenantSlug,
  osId,
  numero,
  clienteNome,
  placa,
  modelo,
  status,
  vendaId,
  open,
  mode,
  onClose,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [motivo, setMotivo] = useState("");
  const [obs, setObs] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!open || !mode) return null;

  const impactoEstoque =
    mode === "cancelar"
      ? "Reservas/separações serão liberadas quando seguro. Estoque já consumido bloqueia o cancelamento."
      : mode === "excluir"
        ? "Só é permitido se não houver reserva, consumo ou aprovação."
        : "Sem impacto direto em estoque.";

  const impactoFin =
    mode === "cancelar" || mode === "excluir"
      ? vendaId
        ? "Há venda vinculada — use o estorno da venda; esta ação será bloqueada."
        : "Sem faturamento vinculado."
      : "Histórico financeiro preservado.";

  function submit() {
    if (!mode) return;
    if (mode !== "restaurar" && motivo.trim().length < 3) {
      setError("Informe o motivo (mín. 3 caracteres).");
      return;
    }
    setError(null);
    startTransition(async () => {
      const texto = [motivo.trim(), obs.trim()].filter(Boolean).join(" — ");
      const payload = { motivo: texto || "Restauração" };
      let res;
      if (mode === "cancelar") {
        res = await cancelarOsAction(tenantSlug, osId, payload);
      } else if (mode === "arquivar") {
        res = await arquivarOsAction(tenantSlug, osId, payload);
      } else if (mode === "excluir") {
        res = await excluirRascunhoOsAction(tenantSlug, osId, payload);
      } else {
        res = await restaurarOsAction(tenantSlug, osId, payload);
      }
      if (!res.success) {
        setError(res.error);
        return;
      }
      setMotivo("");
      setObs("");
      onClose();
      if (mode === "excluir") {
        router.push(`/${tenantSlug}/ordens`);
        router.refresh();
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="os-confirm-title"
        className="w-full max-w-lg space-y-4 rounded-xl border bg-background p-5 shadow-lg"
      >
        <div>
          <h2 id="os-confirm-title" className="text-lg font-semibold">
            Você tem certeza?
          </h2>
          <p className="text-sm text-muted-foreground">{TITLES[mode]}</p>
        </div>

        <dl className="grid gap-2 rounded-lg border bg-muted/20 p-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">OS</dt>
            <dd className="font-medium">#{numero}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Status</dt>
            <dd>
              {OS_STATUS_LABELS[status as OsStatus] ?? status}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Cliente</dt>
            <dd>{clienteNome ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Veículo</dt>
            <dd>
              {placa ?? "—"}
              {modelo ? ` · ${modelo}` : ""}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-muted-foreground">Impacto estoque</dt>
            <dd className="text-muted-foreground">{impactoEstoque}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-muted-foreground">Impacto financeiro</dt>
            <dd className="text-muted-foreground">{impactoFin}</dd>
          </div>
        </dl>

        {error ? <FeedbackMessage variant="error">{error}</FeedbackMessage> : null}

        {mode !== "restaurar" ? (
          <label className="block space-y-1 text-sm">
            <span className="text-muted-foreground">Motivo *</span>
            <Input
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              disabled={pending}
              placeholder="Obrigatório"
              autoFocus
            />
          </label>
        ) : null}
        <label className="block space-y-1 text-sm">
          <span className="text-muted-foreground">Observação (opcional)</span>
          <Input
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            disabled={pending}
          />
        </label>

        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            disabled={pending}
            className={cn(buttonVariants({ variant: "outline" }))}
            onClick={() => {
              setError(null);
              setMotivo("");
              setObs("");
              onClose();
            }}
          >
            Voltar
          </button>
          <button
            type="button"
            disabled={pending}
            className={cn(
              buttonVariants({
                variant: mode === "excluir" ? "destructive" : "default",
              }),
            )}
            onClick={submit}
          >
            {mode === "excluir"
              ? "Confirmar exclusão"
              : mode === "cancelar"
                ? "Confirmar cancelamento"
                : mode === "arquivar"
                  ? "Confirmar arquivamento"
                  : "Confirmar restauração"}
          </button>
        </div>
      </div>
    </div>
  );
}
