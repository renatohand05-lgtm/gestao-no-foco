"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  type ContaLifecycleSnapshot,
  type ParcelScope,
  PARCEL_SCOPE_LABELS,
  buildCancelImpact,
  buildDeleteImpact,
  buildEstornoImpact,
  isParcelada,
} from "@/lib/financeiro/conta-lifecycle";
import { formatCurrency, formatDateOnly } from "@/lib/financeiro/format";
import {
  cancelarContaPagarAction,
  deleteContaPagarAction,
  duplicarContaPagarAction,
  estornarContaPagarAction,
} from "@/lib/financeiro/actions";
import {
  cancelarContaReceberAction,
  deleteContaReceberAction,
  duplicarContaReceberAction,
  estornarContaReceberAction,
} from "@/lib/financeiro/actions";
import { formatContaPagarNumero } from "@/lib/financeiro/conta-pagar-utils";

type Kind = "pagar" | "receber";

type BaseProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantSlug: string;
  kind: Kind;
  snapshot: ContaLifecycleSnapshot;
};

function SnapshotSummary({ snapshot }: { snapshot: ContaLifecycleSnapshot }) {
  return (
    <dl className="mt-3 grid gap-2 rounded-lg border border-border/60 bg-muted/30 p-3 text-sm">
      <div className="flex justify-between gap-3">
        <dt className="text-muted-foreground">Número</dt>
        <dd className="font-medium">{formatContaPagarNumero(snapshot.numero)}</dd>
      </div>
      <div className="flex justify-between gap-3">
        <dt className="text-muted-foreground">Descrição</dt>
        <dd className="max-w-[60%] text-right font-medium">{snapshot.descricao}</dd>
      </div>
      <div className="flex justify-between gap-3">
        <dt className="text-muted-foreground">Partes</dt>
        <dd className="font-medium">{snapshot.counterparty}</dd>
      </div>
      <div className="flex justify-between gap-3">
        <dt className="text-muted-foreground">Valor</dt>
        <dd className="font-medium">{formatCurrency(snapshot.valor_original)}</dd>
      </div>
      <div className="flex justify-between gap-3">
        <dt className="text-muted-foreground">Competência</dt>
        <dd className="font-medium">{formatDateOnly(snapshot.data_competencia)}</dd>
      </div>
      <div className="flex justify-between gap-3">
        <dt className="text-muted-foreground">Status</dt>
        <dd className="font-medium capitalize">{snapshot.status}</dd>
      </div>
    </dl>
  );
}

function ParcelScopeField({
  value,
  onChange,
  show,
}: {
  value: ParcelScope;
  onChange: (v: ParcelScope) => void;
  show: boolean;
}) {
  if (!show) return null;
  return (
    <div className="mt-3 space-y-1">
      <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Escopo do parcelamento
      </label>
      <select
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value as ParcelScope)}
      >
        {(Object.keys(PARCEL_SCOPE_LABELS) as ParcelScope[]).map((key) => (
          <option key={key} value={key}>
            {PARCEL_SCOPE_LABELS[key]}
          </option>
        ))}
      </select>
    </div>
  );
}

export function ContaLifecycleDeleteDialog({
  open,
  onOpenChange,
  tenantSlug,
  kind,
  snapshot,
}: BaseProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState<ParcelScope>("atual");
  const [isPending, startTransition] = useTransition();
  const impact = buildDeleteImpact(snapshot);

  function handleConfirm() {
    if (!impact.allowed) return;
    setError(null);
    startTransition(async () => {
      const result =
        kind === "pagar"
          ? await deleteContaPagarAction(tenantSlug, snapshot.id, { scope })
          : await deleteContaReceberAction(tenantSlug, snapshot.id, { scope });

      if (!result.success) {
        setError(result.error);
        return;
      }

      onOpenChange(false);
      router.push(
        `/${tenantSlug}/financeiro/contas-${kind === "pagar" ? "pagar" : "receber"}?success=deleted`,
      );
      router.refresh();
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent aria-busy={isPending}>
        <AlertDialogHeader>
          <AlertDialogTitle>{impact.title}</AlertDialogTitle>
          <AlertDialogDescription>{impact.summary}</AlertDialogDescription>
        </AlertDialogHeader>
        <SnapshotSummary snapshot={snapshot} />
        <ul className="mt-3 list-inside list-disc text-sm text-muted-foreground">
          {impact.impacts.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <ParcelScopeField
          show={impact.allowed && isParcelada(snapshot)}
          value={scope}
          onChange={setScope}
        />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Fechar</AlertDialogCancel>
          {impact.allowed ? (
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={isPending}
              onClick={(e) => {
                e.preventDefault();
                handleConfirm();
              }}
            >
              {isPending ? "Excluindo..." : "Confirmar exclusão lógica"}
            </AlertDialogAction>
          ) : null}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function ContaLifecycleCancelDialog({
  open,
  onOpenChange,
  tenantSlug,
  kind,
  snapshot,
}: BaseProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [scope, setScope] = useState<ParcelScope>("atual");
  const [isPending, startTransition] = useTransition();
  const impact = buildCancelImpact(snapshot);

  function handleConfirm() {
    if (!impact.allowed) return;
    setError(null);
    startTransition(async () => {
      const result =
        kind === "pagar"
          ? await cancelarContaPagarAction(tenantSlug, snapshot.id, {
              motivo,
              scope,
            })
          : await cancelarContaReceberAction(tenantSlug, snapshot.id, {
              motivo,
              scope,
            });

      if (!result.success) {
        setError(result.error);
        return;
      }

      onOpenChange(false);
      router.push(
        `/${tenantSlug}/financeiro/contas-${kind === "pagar" ? "pagar" : "receber"}/${snapshot.id}?success=cancelado`,
      );
      router.refresh();
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{impact.title}</AlertDialogTitle>
          <AlertDialogDescription>{impact.summary}</AlertDialogDescription>
        </AlertDialogHeader>
        <SnapshotSummary snapshot={snapshot} />
        <ul className="mt-3 list-inside list-disc text-sm text-muted-foreground">
          {impact.impacts.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        {impact.allowed ? (
          <>
            <ParcelScopeField
              show={isParcelada(snapshot)}
              value={scope}
              onChange={setScope}
            />
            <div className="mt-3 space-y-1">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Motivo (opcional)
              </label>
              <Textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                rows={2}
              />
            </div>
          </>
        ) : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Fechar</AlertDialogCancel>
          {impact.allowed ? (
            <AlertDialogAction
              disabled={isPending}
              onClick={(e) => {
                e.preventDefault();
                handleConfirm();
              }}
            >
              {isPending ? "Cancelando..." : "Confirmar cancelamento"}
            </AlertDialogAction>
          ) : null}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function ContaLifecycleEstornoDialog({
  open,
  onOpenChange,
  tenantSlug,
  kind,
  snapshot,
}: BaseProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [dataEstorno, setDataEstorno] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [isPending, startTransition] = useTransition();
  const impact = buildEstornoImpact(kind, snapshot);

  function handleConfirm() {
    if (!impact.allowed) return;
    setError(null);
    startTransition(async () => {
      const result =
        kind === "pagar"
          ? await estornarContaPagarAction(tenantSlug, snapshot.id, {
              motivo,
              data_estorno: dataEstorno,
            })
          : await estornarContaReceberAction(tenantSlug, snapshot.id, {
              motivo,
              data_estorno: dataEstorno,
            });

      if (!result.success) {
        setError(result.error);
        return;
      }

      onOpenChange(false);
      router.push(
        `/${tenantSlug}/financeiro/contas-${kind === "pagar" ? "pagar" : "receber"}/${snapshot.id}?success=estornado`,
      );
      router.refresh();
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{impact.title}</AlertDialogTitle>
          <AlertDialogDescription>{impact.summary}</AlertDialogDescription>
        </AlertDialogHeader>
        <SnapshotSummary snapshot={snapshot} />
        <ul className="mt-3 list-inside list-disc text-sm text-muted-foreground">
          {impact.impacts.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        {impact.allowed ? (
          <div className="mt-3 space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Data do estorno
              </label>
              <Input
                type="date"
                value={dataEstorno}
                onChange={(e) => setDataEstorno(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Motivo (obrigatório)
              </label>
              <Textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                rows={3}
                required
              />
            </div>
          </div>
        ) : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Fechar</AlertDialogCancel>
          {impact.allowed ? (
            <AlertDialogAction
              disabled={isPending || motivo.trim().length < 3}
              onClick={(e) => {
                e.preventDefault();
                handleConfirm();
              }}
            >
              {isPending ? "Estornando..." : "Confirmar estorno"}
            </AlertDialogAction>
          ) : null}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function useDuplicarConta(kind: Kind, tenantSlug: string) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function duplicar(id: string) {
    startTransition(async () => {
      const result =
        kind === "pagar"
          ? await duplicarContaPagarAction(tenantSlug, id)
          : await duplicarContaReceberAction(tenantSlug, id);
      if (!result.success || !result.id) {
        window.alert(result.success === false ? result.error : "Falha ao duplicar.");
        return;
      }
      router.push(
        `/${tenantSlug}/financeiro/contas-${kind === "pagar" ? "pagar" : "receber"}/${result.id}?success=created`,
      );
      router.refresh();
    });
  }

  return { duplicar, isPending };
}
