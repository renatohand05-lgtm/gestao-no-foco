"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useTransition } from "react";
import { X } from "lucide-react";

import {
  parseDashboardSearchParams,
  writeStoredDashboardFilters,
} from "@/lib/dashboard/filter-storage";
import { Button } from "@/components/ui/button";
import { DsIcon } from "@/components/ui/ds-icon";
import { exAnimations, exTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";
import type {
  DashboardFilterOptions,
  DashboardFilters,
} from "@/types/dashboard-executive";

type DashboardFiltersBarProps = {
  tenantSlug: string;
  filters: DashboardFilters;
  filterOptions: DashboardFilterOptions;
  contextPills?: { label: string; value: string }[];
};

const chip = cn(
  "h-8 max-w-[8.5rem] truncate rounded-lg border border-slate-200/70 bg-white px-2.5 text-xs font-medium text-foreground",
  "transition-colors duration-150 hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/25",
  "disabled:opacity-60 dark:border-white/10 dark:bg-transparent",
);

/**
 * Toolbar premium de filtros (Sprint 13.2) — mesmas regras.
 */
export function DashboardFiltersBar({
  tenantSlug,
  filters,
  filterOptions,
  contextPills,
}: DashboardFiltersBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const activeCount = [
    filters.centroCusto,
    filters.categoria,
    filters.contaBancaria,
    filters.status && filters.status !== "all" ? filters.status : null,
  ].filter(Boolean).length;

  function updateParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    const nextFilters = parseDashboardSearchParams(params, {
      dataDe: filters.dataDe,
      dataAte: filters.dataAte,
    });
    writeStoredDashboardFilters(nextFilters);
    startTransition(() => {
      const queryString = params.toString();
      router.push(
        queryString
          ? `/${tenantSlug}/dashboard?${queryString}`
          : `/${tenantSlug}/dashboard`,
      );
    });
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1.5 lg:flex-nowrap",
        exAnimations.fade,
      )}
      aria-label="Filtros do dashboard"
    >
      {contextPills?.map((pill) => (
        <span
          key={pill.label}
          className="inline-flex h-8 max-w-[9rem] items-center gap-1 truncate rounded-lg bg-slate-100/90 px-2.5 text-xs font-medium text-slate-600 dark:bg-white/5 dark:text-white/70"
          title={`${pill.label}: ${pill.value}`}
        >
          <span className="text-slate-400">{pill.label}</span>
          <span className="truncate">{pill.value}</span>
        </span>
      ))}

      <input
        id="dashboard-data-de"
        type="date"
        value={filters.dataDe}
        disabled={isPending}
        onChange={(e) => updateParams({ dataDe: e.target.value || null })}
        className={chip}
        aria-label="Período de"
      />
      <span className="text-[10px] text-muted-foreground" aria-hidden>
        –
      </span>
      <input
        id="dashboard-data-ate"
        type="date"
        value={filters.dataAte}
        disabled={isPending}
        onChange={(e) => updateParams({ dataAte: e.target.value || null })}
        className={chip}
        aria-label="Período até"
      />

      <select
        id="dashboard-centro-custo"
        value={filters.centroCusto ?? ""}
        disabled={isPending}
        onChange={(e) =>
          updateParams({ centroCusto: e.target.value || null })
        }
        className={chip}
        aria-label="Centro"
      >
        <option value="">Centro</option>
        {filterOptions.centrosCusto.map((item) => (
          <option key={item.id} value={item.id}>
            {item.nome}
          </option>
        ))}
      </select>

      <select
        id="dashboard-categoria"
        value={filters.categoria ?? ""}
        disabled={isPending}
        onChange={(e) =>
          updateParams({ categoria: e.target.value || null })
        }
        className={chip}
        aria-label="Categoria"
      >
        <option value="">Categoria</option>
        {filterOptions.categorias.map((item) => (
          <option key={item.id} value={item.id}>
            {item.nome}
          </option>
        ))}
      </select>

      <select
        id="dashboard-conta"
        value={filters.contaBancaria ?? ""}
        disabled={isPending}
        onChange={(e) => updateParams({ conta: e.target.value || null })}
        className={chip}
        aria-label="Canal"
      >
        <option value="">Canal</option>
        {filterOptions.contasBancarias.map((item) => (
          <option key={item.id} value={item.id}>
            {item.nome}
          </option>
        ))}
      </select>

      <select
        id="dashboard-status"
        value={filters.status ?? "all"}
        disabled={isPending}
        onChange={(e) =>
          updateParams({
            status: e.target.value === "all" ? null : e.target.value,
          })
        }
        className={chip}
        aria-label="Status"
      >
        <option value="all">Status</option>
        <option value="realizado">Realizado</option>
        <option value="previsto">Previsto</option>
      </select>

      {activeCount > 0 ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() =>
            updateParams({
              centroCusto: null,
              categoria: null,
              conta: null,
              status: null,
            })
          }
          aria-label={`Limpar ${activeCount} filtros`}
        >
          <DsIcon icon={X} size="xs" className="mr-1" />
          Limpar
          <span className="ml-1 inline-flex size-4 items-center justify-center rounded-full bg-slate-900 text-[10px] text-white dark:bg-white dark:text-slate-900">
            {activeCount}
          </span>
        </Button>
      ) : null}

      {isPending ? (
        <p className={exTypography.caption} role="status" aria-live="polite">
          Atualizando…
        </p>
      ) : null}
    </div>
  );
}

type DashboardFilterPersistenceProps = {
  tenantSlug: string;
  defaults: Pick<DashboardFilters, "dataDe" | "dataAte">;
};

export function DashboardFilterPersistence({
  tenantSlug,
  defaults,
}: DashboardFilterPersistenceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const hasOptionalFilters =
      searchParams.has("centroCusto") ||
      searchParams.has("categoria") ||
      searchParams.has("conta") ||
      searchParams.has("status") ||
      searchParams.has("dataDe") ||
      searchParams.has("dataAte");

    if (hasOptionalFilters) return;

    import("@/lib/dashboard/filter-storage").then(
      ({ readStoredDashboardFilters }) => {
        const stored = readStoredDashboardFilters();
        if (!stored) return;
        const params = new URLSearchParams();
        params.set("dataDe", stored.dataDe ?? defaults.dataDe);
        params.set("dataAte", stored.dataAte ?? defaults.dataAte);
        if (stored.centroCusto) params.set("centroCusto", stored.centroCusto);
        if (stored.categoria) params.set("categoria", stored.categoria);
        if (stored.contaBancaria) params.set("conta", stored.contaBancaria);
        if (stored.status && stored.status !== "all") {
          params.set("status", stored.status);
        }
        router.replace(`/${tenantSlug}/dashboard?${params.toString()}`);
      },
    );
  }, [defaults.dataAte, defaults.dataDe, router, searchParams, tenantSlug]);

  return null;
}
