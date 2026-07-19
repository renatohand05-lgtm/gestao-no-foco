"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

type Props = {
  tenantSlug: string;
  dataDe: string;
  dataAte: string;
};

export function FiPeriodFilters({ tenantSlug, dataDe, dataAte }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function update(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      params.set(key, value);
    }
    startTransition(() => {
      router.push(`/${tenantSlug}/financeiro/inteligencia?${params.toString()}`);
    });
  }

  function applyPreset(days: number) {
    const ate = new Date();
    const de = new Date();
    de.setDate(de.getDate() - (days - 1));
    const toIso = (d: Date) => d.toISOString().slice(0, 10);
    update({ dataDe: toIso(de), dataAte: toIso(ate) });
  }

  function applyMonth() {
    const now = new Date();
    const de = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .slice(0, 10);
    update({ dataDe: de, dataAte: last });
  }

  function applyYtd() {
    const now = new Date();
    update({
      dataDe: `${now.getFullYear()}-01-01`,
      dataAte: now.toISOString().slice(0, 10),
    });
  }

  const inputClass =
    "flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/40 p-4 md:flex-row md:flex-wrap md:items-end md:justify-between">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
          onClick={() => applyPreset(7)}
          disabled={isPending}
        >
          7 dias
        </button>
        <button
          type="button"
          className="rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
          onClick={() => applyPreset(30)}
          disabled={isPending}
        >
          30 dias
        </button>
        <button
          type="button"
          className="rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
          onClick={applyMonth}
          disabled={isPending}
        >
          Mês atual
        </button>
        <button
          type="button"
          className="rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
          onClick={applyYtd}
          disabled={isPending}
        >
          Ano atual
        </button>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <label className="space-y-1 text-xs text-muted-foreground">
          De
          <input
            type="date"
            className={inputClass}
            defaultValue={dataDe}
            onChange={(e) => update({ dataDe: e.target.value })}
          />
        </label>
        <label className="space-y-1 text-xs text-muted-foreground">
          Até
          <input
            type="date"
            className={inputClass}
            defaultValue={dataAte}
            onChange={(e) => update({ dataAte: e.target.value })}
          />
        </label>
      </div>
    </div>
  );
}
