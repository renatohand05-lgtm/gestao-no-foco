"use client";

import { useState, useTransition } from "react";

import { buttonVariants } from "@/components/ui/button";
import { FastInputCtaBar, MoreDetails } from "@/components/ui/more-details";
import { PostSaveActions } from "@/components/ui/post-save-actions";
import { createManualReturnAction } from "@/lib/retention/actions";
import {
  FAST_RETURN_PRESETS,
  agendaHref,
  intervalFromFastPreset,
} from "@/lib/ux/fast-input";
import { cn } from "@/lib/utils";

type Props = {
  tenantSlug: string;
  clienteId: string;
  clienteLocked?: boolean;
  clientes?: Array<{ id: string; nome: string }>;
  showVehicle?: boolean;
  hideProcedure?: boolean;
  produtoId?: string | null;
  profissionalId?: string | null;
  placa?: string;
  onCreated?: () => void;
};

export function ReturnQuickCreate({
  tenantSlug,
  clienteId,
  clienteLocked = false,
  clientes = [],
  showVehicle = false,
  hideProcedure = false,
  produtoId = null,
  profissionalId = null,
  placa: placaInicial = "",
  onCreated,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [selectedCliente, setSelectedCliente] = useState(clienteId);
  const [presetKey, setPresetKey] = useState("30d");
  const [specificDate, setSpecificDate] = useState("");
  const [motivo, setMotivo] = useState("");
  const [lastKm, setLastKm] = useState("");
  const [mileage, setMileage] = useState("");
  const [placa, setPlaca] = useState(placaInicial);

  function create() {
    setError(null);
    startTransition(async () => {
      const custom = presetKey === "custom";
      const interval = custom
        ? { presetDays: null, intervalMonths: null }
        : intervalFromFastPreset(presetKey);
      const res = await createManualReturnAction(tenantSlug, {
        clienteId: selectedCliente,
        presetDays: interval.presetDays,
        intervalMonths: interval.intervalMonths,
        specificDate: custom ? specificDate || null : null,
        motivo: motivo.trim() || null,
        lastKm: lastKm ? Number(lastKm) : null,
        mileageKm: mileage ? Number(mileage) : null,
        placa: placa.trim() || null,
        produtoId,
        profissionalId,
        hideProcedure,
      });
      if (!res.success) {
        setError(res.error ?? "Falha ao criar retorno.");
        return;
      }
      setCreatedId(res.id ?? "ok");
      onCreated?.();
    });
  }

  if (createdId) {
    return (
      <PostSaveActions
        title="Retorno criado"
        actions={[
          {
            href: `/${tenantSlug}/crm/retornos`,
            label: "Ver retornos",
            primary: true,
          },
          {
            href: agendaHref(tenantSlug, {
              natureza: "cliente",
              clienteId: selectedCliente,
              servicoId: produtoId,
              profissionalId,
              returnId: createdId === "ok" ? null : createdId,
            }),
            label: "Agendar agora",
          },
          {
            label: "Criar outro",
            onClick: () => {
              setCreatedId(null);
              setMotivo("");
              setSpecificDate("");
              setLastKm("");
              setMileage("");
            },
          },
        ]}
      />
    );
  }

  return (
    <div className="space-y-3" data-fast-input="return-quick">
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <div
        className="grid gap-2 sm:grid-cols-2"
        data-fast-input="essentials"
      >
        {!clienteLocked && clientes.length > 0 ? (
          <label className="text-xs">
            Cliente *
            <select
              className="mt-1 min-h-11 w-full rounded-md border bg-background px-2 py-1.5 text-sm"
              value={selectedCliente}
              onChange={(e) => setSelectedCliente(e.target.value)}
            >
              <option value="">Selecionar cliente</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <fieldset className="sm:col-span-2">
          <legend className="text-xs font-medium">Retornar em</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {FAST_RETURN_PRESETS.map((p) => (
              <button
                key={p.key}
                type="button"
                className={cn(
                  "min-h-11 rounded-md border px-3 py-1.5 text-sm",
                  presetKey === p.key ? "bg-muted font-medium" : "hover:bg-muted",
                )}
                onClick={() => setPresetKey(p.key)}
              >
                {p.label}
              </button>
            ))}
            <button
              type="button"
              className={cn(
                "min-h-11 rounded-md border px-3 py-1.5 text-sm",
                presetKey === "custom" ? "bg-muted font-medium" : "hover:bg-muted",
              )}
              onClick={() => setPresetKey("custom")}
            >
              Escolher data
            </button>
          </div>
        </fieldset>
        {presetKey === "custom" ? (
          <label className="text-xs">
            Data
            <input
              type="date"
              className="mt-1 min-h-11 w-full rounded-md border bg-background px-2 py-1.5 text-sm"
              value={specificDate}
              onChange={(e) => setSpecificDate(e.target.value)}
            />
          </label>
        ) : null}
        <label className="text-xs sm:col-span-2">
          Motivo / observação (opcional)
          <input
            className="mt-1 min-h-11 w-full rounded-md border bg-background px-2 py-1.5 text-sm"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Opcional"
          />
        </label>
      </div>
      <FastInputCtaBar>
        <button
          type="button"
          disabled={pending || !selectedCliente}
          className={cn(buttonVariants(), "min-h-11")}
          onClick={create}
        >
          {pending ? "Salvando..." : "Criar retorno"}
        </button>
      </FastInputCtaBar>
      {showVehicle ? (
        <MoreDetails summary="Mais informações">
          <div className="grid gap-2 sm:grid-cols-3">
            <label className="text-xs">
              Placa
              <input
                className="mt-1 min-h-11 w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                value={placa}
                onChange={(e) => setPlaca(e.target.value)}
              />
            </label>
            <label className="text-xs">
              Km atual
              <input
                type="number"
                min={0}
                className="mt-1 min-h-11 w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                value={lastKm}
                onChange={(e) => setLastKm(e.target.value)}
              />
            </label>
            <label className="text-xs">
              Intervalo km
              <input
                type="number"
                min={0}
                className="mt-1 min-h-11 w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                value={mileage}
                onChange={(e) => setMileage(e.target.value)}
              />
            </label>
          </div>
        </MoreDetails>
      ) : (
        <MoreDetails summary="Mais informações">
          <p className="text-sm text-muted-foreground">
            Retorno previsto não reserva horário. Quando o cliente voltar, use
            Agendar.
          </p>
        </MoreDetails>
      )}
    </div>
  );
}
