"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { ExecutiveButton } from "@/components/executive";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { gofCardSurface } from "@/lib/design-system/primitives";
import { OS_CANCEL_REASONS } from "@/lib/ordens/budget-gate";
import {
  arquivarOsAction,
  cancelarOsAction,
  excluirPermanentementeOsAction,
  excluirRascunhoOsAction,
  restaurarOsAction,
} from "@/lib/ordens/actions";
import { OS_STATUS_LABELS, type OsStatus } from "@/lib/ordens/os-status";
import { cn } from "@/lib/utils";

export type OsLifecycleMode =
  | "cancelar"
  | "arquivar"
  | "excluir"
  | "excluir_permanente"
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
  cancelLabel?: string;
  onClose: () => void;
};

const TITLES: Record<OsLifecycleMode, string> = {
  cancelar: "Cancelar",
  arquivar: "Arquivar",
  excluir: "Excluir rascunho",
  excluir_permanente: "Excluir permanentemente",
  restaurar: "Restaurar",
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
  cancelLabel = "Cancelar OS",
  onClose,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [motivoCodigo, setMotivoCodigo] = useState("engano");
  const [motivo, setMotivo] = useState("");
  const [obs, setObs] = useState("");
  const [substituidaPor, setSubstituidaPor] = useState("");
  const [cancelarAgenda, setCancelarAgenda] = useState(false);
  const [confirmacao, setConfirmacao] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!open || !mode) return null;

  const reasonMeta = OS_CANCEL_REASONS.find((r) => r.id === motivoCodigo);
  const impactoEstoque =
    mode === "cancelar" || mode === "excluir_permanente"
      ? "Reservas/separações serão liberadas quando seguro. Estoque já consumido bloqueia a ação."
      : mode === "excluir"
        ? "Só é permitido se não houver reserva, consumo ou aprovação."
        : "Sem impacto direto em estoque.";

  const impactoFin =
    mode === "cancelar" || mode === "excluir" || mode === "excluir_permanente"
      ? vendaId
        ? "Há venda vinculada — use o estorno da venda; esta ação será bloqueada."
        : "Sem faturamento vinculado."
      : "Histórico financeiro preservado.";

  function submit() {
    if (!mode) return;
    if (mode === "excluir_permanente" && confirmacao !== "EXCLUIR") {
      setError("Digite EXCLUIR para confirmar.");
      return;
    }
    if (mode === "cancelar") {
      if (reasonMeta?.obsRequired && obs.trim().length < 3) {
        setError("Informe a observação para o motivo Outro.");
        return;
      }
    } else if (mode !== "restaurar" && motivo.trim().length < 3) {
      setError("Informe o motivo (mín. 3 caracteres).");
      return;
    }
    setError(null);
    startTransition(async () => {
      const reasonLabel =
        OS_CANCEL_REASONS.find((r) => r.id === motivoCodigo)?.label ?? motivoCodigo;
      const textoCancel = [reasonLabel, obs.trim(), substituidaPor.trim() ? `Substituída pela OS ${substituidaPor.trim()}` : ""]
        .filter(Boolean)
        .join(" — ");
      const texto = mode === "cancelar" ? textoCancel : [motivo.trim(), obs.trim()].filter(Boolean).join(" — ");
      let res;
      if (mode === "cancelar") {
        res = await cancelarOsAction(tenantSlug, osId, {
          motivo: texto || "Cancelamento",
          motivo_codigo: motivoCodigo,
          substituida_por: /^[0-9a-f-]{36}$/i.test(substituidaPor.trim())
            ? substituidaPor.trim()
            : "",
          cancelar_agenda: cancelarAgenda,
        });
      } else if (mode === "arquivar") {
        res = await arquivarOsAction(tenantSlug, osId, { motivo: texto });
      } else if (mode === "excluir") {
        res = await excluirRascunhoOsAction(tenantSlug, osId, { motivo: texto });
      } else if (mode === "excluir_permanente") {
        res = await excluirPermanentementeOsAction(tenantSlug, osId, {
          motivo: texto || "Exclusão definitiva",
          confirmacao: "EXCLUIR",
        });
      } else {
        res = await restaurarOsAction(tenantSlug, osId, { motivo: texto || "Restauração" });
      }
      if (!res.success) {
        setError(res.error);
        return;
      }
      setMotivo("");
      setObs("");
      setConfirmacao("");
      onClose();
      if (mode === "excluir" || mode === "excluir_permanente") {
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
        className={cn(gofCardSurface, "w-full max-w-lg space-y-4 p-5")}
      >
        <div>
          <h2 id="os-confirm-title" className="text-lg font-semibold">
            Você tem certeza?
          </h2>
          <p className="text-sm text-muted-foreground">
            {mode === "cancelar" ? cancelLabel : TITLES[mode]}
          </p>
        </div>

        <dl className="grid gap-2 rounded-lg border bg-muted/20 p-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">Nº</dt>
            <dd className="font-medium">#{numero}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Status</dt>
            <dd>{OS_STATUS_LABELS[status as OsStatus] ?? status}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Cliente</dt>
            <dd>{clienteNome ?? "—"}</dd>
          </div>
          {placa || modelo ? (
            <div>
              <dt className="text-xs text-muted-foreground">Veículo</dt>
              <dd>
                {placa ?? "—"}
                {modelo ? ` · ${modelo}` : ""}
              </dd>
            </div>
          ) : null}
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

        {mode === "cancelar" ? (
          <>
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">Motivo *</span>
              <NativeSelect
                value={motivoCodigo}
                onChange={(e) => setMotivoCodigo(e.target.value)}
                disabled={pending}
                className="h-11"
              >
                {OS_CANCEL_REASONS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </NativeSelect>
            </label>
            {motivoCodigo === "duplicada" ? (
              <label className="block space-y-1 text-sm">
                <span className="text-muted-foreground">Substituída pela OS # (opcional)</span>
                <Input
                  value={substituidaPor}
                  onChange={(e) => setSubstituidaPor(e.target.value)}
                  disabled={pending}
                  placeholder="Número ou código"
                />
              </label>
            ) : null}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={cancelarAgenda}
                onChange={(e) => setCancelarAgenda(e.target.checked)}
                disabled={pending}
              />
              Também cancelar agendamento
            </label>
          </>
        ) : mode !== "restaurar" ? (
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
          <span className="text-muted-foreground">
            Observação {reasonMeta?.obsRequired && mode === "cancelar" ? "*" : "(opcional)"}
          </span>
          <Input
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            disabled={pending}
          />
        </label>
        {mode === "excluir_permanente" ? (
          <label className="block space-y-1 text-sm">
            <span className="text-muted-foreground">Digite EXCLUIR *</span>
            <Input
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
              disabled={pending}
              placeholder="EXCLUIR"
            />
          </label>
        ) : null}

        <p className="text-xs text-muted-foreground">
          Cliente, catálogo e agenda original não são apagados.
        </p>

        <div className="flex flex-wrap justify-end gap-2">
          <ExecutiveButton
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => {
              setError(null);
              setMotivo("");
              setObs("");
              setConfirmacao("");
              onClose();
            }}
          >
            Voltar
          </ExecutiveButton>
          <ExecutiveButton
            type="button"
            disabled={pending}
            loading={pending}
            variant={
              mode === "excluir" || mode === "excluir_permanente"
                ? "destructive"
                : "default"
            }
            onClick={submit}
          >
            {mode === "excluir_permanente"
              ? "Confirmar exclusão definitiva"
              : mode === "excluir"
                ? "Confirmar exclusão"
                : mode === "cancelar"
                  ? "Confirmar cancelamento"
                  : mode === "arquivar"
                    ? "Confirmar arquivamento"
                    : "Confirmar restauração"}
          </ExecutiveButton>
        </div>
      </div>
    </div>
  );
}
