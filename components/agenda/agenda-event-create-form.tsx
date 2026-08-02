"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { buttonVariants } from "@/components/ui/button";
import { createAgendaEventAction } from "@/lib/agenda/actions";
import { cn } from "@/lib/utils";

type Props = { tenantSlug: string };

export function AgendaEventCreateForm({ tenantSlug }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [titulo, setTitulo] = useState("");
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [tipo, setTipo] = useState("compromisso");
  const [freq, setFreq] = useState<"nenhuma" | "diaria" | "semanal" | "mensal">(
    "nenhuma",
  );
  const [count, setCount] = useState(1);
  const [override, setOverride] = useState(false);
  const [justificativa, setJustificativa] = useState("");

  function submit() {
    setError(null);
    startTransition(async () => {
      const inicioIso = inicio.includes("T")
        ? new Date(inicio).toISOString()
        : new Date(`${inicio}:00`).toISOString();
      const fimIso = fim.includes("T")
        ? new Date(fim).toISOString()
        : new Date(`${fim}:00`).toISOString();
      const res = await createAgendaEventAction(tenantSlug, {
        titulo,
        tipo,
        inicio: inicioIso,
        fim: fimIso,
        recorrencia_frequency: freq,
        recorrencia_count: count,
        override_conflito: override,
        override_justificativa: justificativa || null,
      });
      if (!res.success) {
        setError(res.error ?? "Falha");
        return;
      }
      setTitulo("");
      router.refresh();
    });
  }

  return (
    <div
      className="space-y-3 rounded-xl border p-4"
      data-phase28="agenda-create"
    >
      <h2 className="text-sm font-semibold">Novo evento</h2>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-xs">
          Título
          <input
            className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            aria-label="Título do evento"
          />
        </label>
        <label className="text-xs">
          Tipo
          <select
            className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
          >
            <option value="compromisso">Compromisso</option>
            <option value="visita">Visita</option>
            <option value="follow_up">Follow-up</option>
            <option value="os">OS</option>
            <option value="tarefa">Tarefa</option>
          </select>
        </label>
        <label className="text-xs">
          Início
          <input
            type="datetime-local"
            className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm"
            value={inicio}
            onChange={(e) => setInicio(e.target.value)}
          />
        </label>
        <label className="text-xs">
          Fim
          <input
            type="datetime-local"
            className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm"
            value={fim}
            onChange={(e) => setFim(e.target.value)}
          />
        </label>
        <label className="text-xs">
          Recorrência
          <select
            className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm"
            value={freq}
            onChange={(e) =>
              setFreq(e.target.value as typeof freq)
            }
          >
            <option value="nenhuma">Nenhuma</option>
            <option value="diaria">Diária</option>
            <option value="semanal">Semanal</option>
            <option value="mensal">Mensal</option>
          </select>
        </label>
        {freq !== "nenhuma" ? (
          <label className="text-xs">
            Ocorrências (máx. 52)
            <input
              type="number"
              min={1}
              max={52}
              className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm"
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            />
          </label>
        ) : null}
      </div>
      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={override}
          onChange={(e) => setOverride(e.target.checked)}
        />
        Sobrescrever conflito (exige justificativa)
      </label>
      {override ? (
        <input
          className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
          placeholder="Justificativa"
          value={justificativa}
          onChange={(e) => setJustificativa(e.target.value)}
        />
      ) : null}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        disabled={pending}
        className={cn(buttonVariants({ size: "sm" }))}
        onClick={submit}
      >
        {pending ? "Salvando…" : "Criar evento"}
      </button>
    </div>
  );
}
