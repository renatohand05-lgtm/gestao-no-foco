"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import {
  ExecutiveButton,
  ExecutiveFilter,
  ExecutiveFilterField,
} from "@/components/executive";
import { gofControl } from "@/lib/design-system";
import { cn } from "@/lib/utils";

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

  return (
    <ExecutiveFilter
      label="Filtros"
      actions={
        <div className="flex flex-wrap gap-2">
          <ExecutiveButton
            type="button"
            size="sm"
            variant="outline"
            onClick={() => applyPreset(7)}
            disabled={isPending}
          >
            7 dias
          </ExecutiveButton>
          <ExecutiveButton
            type="button"
            size="sm"
            variant="outline"
            onClick={() => applyPreset(30)}
            disabled={isPending}
          >
            30 dias
          </ExecutiveButton>
          <ExecutiveButton
            type="button"
            size="sm"
            variant="outline"
            onClick={applyMonth}
            disabled={isPending}
          >
            Mês atual
          </ExecutiveButton>
          <ExecutiveButton
            type="button"
            size="sm"
            variant="outline"
            onClick={applyYtd}
            disabled={isPending}
          >
            Ano atual
          </ExecutiveButton>
        </div>
      }
    >
      <ExecutiveFilterField label="De" htmlFor="fi-data-de">
        <input
          id="fi-data-de"
          type="date"
          className={cn(gofControl, "w-full")}
          defaultValue={dataDe}
          onChange={(e) => update({ dataDe: e.target.value })}
          disabled={isPending}
        />
      </ExecutiveFilterField>
      <ExecutiveFilterField label="Até" htmlFor="fi-data-ate">
        <input
          id="fi-data-ate"
          type="date"
          className={cn(gofControl, "w-full")}
          defaultValue={dataAte}
          onChange={(e) => update({ dataAte: e.target.value })}
          disabled={isPending}
        />
      </ExecutiveFilterField>
    </ExecutiveFilter>
  );
}
