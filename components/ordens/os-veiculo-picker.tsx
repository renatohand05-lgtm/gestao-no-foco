"use client";

import { useState, useTransition } from "react";

import { OsVeiculoQuickDialog } from "@/components/ordens/os-veiculo-quick-dialog";
import { buttonVariants } from "@/components/ui/button";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { listVeiculosByClienteAction } from "@/lib/ordens/actions";
import {
  formatVeiculoLabel,
  type VeiculoOption,
} from "@/lib/ordens/veiculo-shared";
import { cn } from "@/lib/utils";

type Props = {
  tenantSlug: string;
  clienteId: string;
  value: string;
  onChange: (veiculoId: string) => void;
  veiculos: VeiculoOption[];
  loading?: boolean;
  error?: string | null;
  onRefresh: (selectId?: string) => void;
  disabled?: boolean;
};

export function OsVeiculoPicker({
  tenantSlug,
  clienteId,
  value,
  onChange,
  veiculos,
  loading,
  error,
  onRefresh,
  disabled,
}: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);

  if (!clienteId) {
    return (
      <p className="rounded-lg border border-dashed px-3 py-4 text-sm text-muted-foreground">
        Selecione o cliente para carregar os veículos.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {error ? <FeedbackMessage variant="error">{error}</FeedbackMessage> : null}

      {loading && veiculos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Carregando veículos…</p>
      ) : null}

      {!loading && veiculos.length === 0 ? (
        <div className="space-y-3 rounded-lg border border-dashed px-3 py-4">
          <p className="text-sm text-muted-foreground">
            Este cliente ainda não possui veículos ativos.
          </p>
          <button
            type="button"
            disabled={disabled}
            className={cn(buttonVariants({ size: "sm" }))}
            onClick={() => setDialogOpen(true)}
          >
            Cadastrar veículo
          </button>
        </div>
      ) : null}

      {veiculos.length > 0 ? (
        <>
          <label className="block space-y-1 text-sm">
            <span className="text-muted-foreground">Veículo</span>
            <select
              required
              disabled={disabled || loading}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            >
              <option value="">Selecione…</option>
              {veiculos.map((v) => (
                <option key={v.id} value={v.id}>
                  {formatVeiculoLabel(v)}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={disabled || loading}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            onClick={() => setDialogOpen(true)}
          >
            Cadastrar novo veículo
          </button>
        </>
      ) : null}

      <OsVeiculoQuickDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        tenantSlug={tenantSlug}
        clienteId={clienteId}
        onCreated={(id) => onRefresh(id)}
      />
    </div>
  );
}

/** Helper para carregar veículos no pai (evita setState em effect). */
export function useClienteVeiculos(
  tenantSlug: string,
  initial: VeiculoOption[] = [],
) {
  const [veiculos, setVeiculos] = useState<VeiculoOption[]>(initial);
  const [error, setError] = useState<string | null>(null);
  const [loading, startTransition] = useTransition();

  function load(
    clienteId: string,
    selectId?: string,
    onSelect?: (id: string) => void,
  ) {
    if (!clienteId) {
      setVeiculos([]);
      setError(null);
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await listVeiculosByClienteAction(tenantSlug, clienteId);
      if (!result.success) {
        setError(result.error);
        setVeiculos([]);
        return;
      }
      setVeiculos(result.veiculos);
      if (selectId) onSelect?.(selectId);
    });
  }

  return { veiculos, error, loading, load, setVeiculos };
}
