"use client";

import { useState, useTransition } from "react";

import { FeedbackMessage } from "@/components/ui/feedback-message";
import { Input } from "@/components/ui/input";
import { SaveButton } from "@/components/ui/save-button";
import {
  DESCONTO_TIPO_LABELS,
  DESCONTO_TIPOS,
} from "@/lib/permissoes/constants";
import { aplicarDescontoOsAction } from "@/lib/ordens/actions";
import { formatCurrency } from "@/lib/format";
import type { ClienteRecorrencia } from "@/lib/crm/cliente-recorrencia-service";

type Props = {
  tenantSlug: string;
  osId: string;
  subtotal: number;
  recorrencia?: ClienteRecorrencia | null;
  canApply: boolean;
};

export function OsDescontoPanel({
  tenantSlug,
  osId,
  subtotal,
  recorrencia,
  canApply,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  if (!canApply) {
    return (
      <p className="text-sm text-muted-foreground">
        Seu perfil não pode aplicar desconto nesta OS.
      </p>
    );
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        setOk(null);
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
          const result = await aplicarDescontoOsAction(tenantSlug, osId, {
            desconto_valor: Number(fd.get("desconto_valor") || 0),
            desconto_percentual: Number(fd.get("desconto_percentual") || 0),
            desconto_motivo: String(fd.get("desconto_motivo") ?? ""),
            desconto_tipo: String(fd.get("desconto_tipo") ?? "outro"),
            desconto_cliente_recorrente: Boolean(recorrencia?.isRecorrente),
            desconto_observacao: String(fd.get("desconto_observacao") ?? "") || null,
          });
          if (!result.success) {
            setError(result.error);
            return;
          }
          setOk("Desconto registrado.");
        });
      }}
    >
      {error ? <FeedbackMessage variant="error">{error}</FeedbackMessage> : null}
      {ok ? <FeedbackMessage variant="success">{ok}</FeedbackMessage> : null}

      {recorrencia ? (
        <div className="rounded-md border bg-muted/30 p-3 text-sm">
          {recorrencia.isRecorrente ? (
            <p className="font-medium text-emerald-700 dark:text-emerald-400">
              Cliente recorrente
            </p>
          ) : (
            <p className="text-muted-foreground">Cliente ainda não recorrente</p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            {recorrencia.qtdOs} OS · {recorrencia.qtdCompras} compras · total{" "}
            {formatCurrency(recorrencia.valorTotal)} · ticket{" "}
            {formatCurrency(recorrencia.ticketMedio)}
            {recorrencia.ultimaCompra
              ? ` · última ${recorrencia.ultimaCompra}`
              : ""}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Descontos 30/90/365d: {formatCurrency(recorrencia.descontos30)} /{" "}
            {formatCurrency(recorrencia.descontos90)} /{" "}
            {formatCurrency(recorrencia.descontos365)}
          </p>
          {recorrencia.alertaAbusoDesconto ? (
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
              Atenção: descontos altos no último ano em relação ao histórico.
            </p>
          ) : null}
        </div>
      ) : null}

      <p className="text-sm text-muted-foreground">
        Subtotal orçamento: <strong>{formatCurrency(subtotal)}</strong>
      </p>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block space-y-1 text-sm">
          <span className="text-muted-foreground">Desconto R$</span>
          <Input name="desconto_valor" type="number" min={0} step="0.01" defaultValue={0} />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-muted-foreground">Desconto %</span>
          <Input
            name="desconto_percentual"
            type="number"
            min={0}
            max={100}
            step="0.01"
            defaultValue={0}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-muted-foreground">Tipo *</span>
          <select
            name="desconto_tipo"
            required
            className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            defaultValue={
              recorrencia?.isRecorrente ? "cliente_recorrente" : "negociacao_comercial"
            }
          >
            {DESCONTO_TIPOS.map((t) => (
              <option key={t} value={t}>
                {DESCONTO_TIPO_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-muted-foreground">Motivo *</span>
          <Input name="desconto_motivo" required />
        </label>
        <label className="block space-y-1 text-sm md:col-span-2">
          <span className="text-muted-foreground">Observação</span>
          <Input name="desconto_observacao" />
        </label>
      </div>

      <SaveButton loading={pending} loadingText="Aplicando…">
        Aplicar desconto
      </SaveButton>
    </form>
  );
}
