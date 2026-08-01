"use client";

import { gfType } from "@/lib/design-system/signature";
import { cn } from "@/lib/utils";
import type { TaxConfidenceLevel, TaxScenarioType } from "@/lib/tax/types";
import { compareRegimesLanguage } from "@/lib/tax/simulation";

export function GFTaxAssumptionsPanel({
  assumptions,
  limitations,
}: {
  assumptions: string[];
  limitations: string[];
}) {
  return (
    <div data-gf-tax-assumptions-panel="" className="space-y-2">
      <p className={gfType.sectionTitle}>Premissas visíveis</p>
      <ul className={cn(gfType.caption, "list-disc pl-4")}>
        {assumptions.length === 0 ? (
          <li>Nenhuma premissa informada</li>
        ) : (
          assumptions.map((a) => <li key={a}>{a}</li>)
        )}
      </ul>
      <p className={gfType.sectionTitle}>Limitações</p>
      <ul className={cn(gfType.caption, "list-disc pl-4")}>
        {limitations.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
      <p className={gfType.caption}>
        Validação contábil e fiscal profissional é obrigatória antes de qualquer
        decisão.
      </p>
    </div>
  );
}

export function GFTaxScenarioTabs({
  scenarios,
  active,
  onSelect,
}: {
  scenarios: TaxScenarioType[];
  active: TaxScenarioType;
  onSelect?: (t: TaxScenarioType) => void;
}) {
  return (
    <div data-gf-tax-scenario-tabs="" className="flex flex-wrap gap-2">
      {scenarios.map((s) => (
        <button
          key={s}
          type="button"
          data-active={s === active ? "1" : "0"}
          className={cn(
            "rounded-lg border px-2.5 py-1 text-xs",
            s === active
              ? "border-[var(--gf-border-active)]"
              : "border-[var(--gf-border-subtle)]",
          )}
          onClick={() => onSelect?.(s)}
        >
          {s}
        </button>
      ))}
    </div>
  );
}

export function GFTaxSimulationBuilder() {
  return (
    <div
      data-gf-tax-simulation-builder=""
      className="space-y-3 rounded-xl border border-[var(--gf-border-subtle)] p-4"
    >
      <p className={gfType.sectionTitle}>Construtor de simulação</p>
      <p className={gfType.caption}>
        Isolado do cálculo oficial · mutatesOfficial=false · requer versões de
        regra e premissas explícitas.
      </p>
      <label className="block text-xs">
        Nome
        <input className="mt-1 w-full rounded-lg border border-[var(--gf-border-subtle)] px-2 py-1.5 text-sm" />
      </label>
      <label className="block text-xs">
        Período base
        <input
          placeholder="YYYY-MM"
          className="mt-1 w-full rounded-lg border border-[var(--gf-border-subtle)] px-2 py-1.5 text-sm"
        />
      </label>
    </div>
  );
}

export function GFTaxVariableEditor() {
  return (
    <div data-gf-tax-variable-editor="" className="space-y-2">
      <p className={gfType.sectionTitle}>Variáveis</p>
      <p className={gfType.caption}>
        Somente campos com modelo/fonte. Sem modelo → marcar indisponível.
      </p>
      <label className="block text-xs">
        Crescimento receita (%)
        <input
          type="number"
          name="revenueGrowthPct"
          className="mt-1 w-full rounded-lg border border-[var(--gf-border-subtle)] px-2 py-1.5 text-sm"
        />
      </label>
      <label className="block text-xs">
        Alíquota efetiva informada (opcional)
        <input
          type="number"
          step="0.0001"
          name="rateEffective"
          className="mt-1 w-full rounded-lg border border-[var(--gf-border-subtle)] px-2 py-1.5 text-sm"
          placeholder="não inventar — informar se houver fonte"
        />
      </label>
    </div>
  );
}

export function GFTaxRegimeComparison({
  winnerLabel,
  confidence,
}: {
  winnerLabel: string;
  confidence: TaxConfidenceLevel;
}) {
  return (
    <div data-gf-tax-regime-comparison="" className="space-y-2">
      <p className={gfType.sectionTitle}>Comparação de regimes</p>
      <p className={gfType.body}>{compareRegimesLanguage(winnerLabel)}</p>
      <p className={gfType.caption}>Confiança: {confidence}</p>
    </div>
  );
}

export function GFTaxImpactChart({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) {
  return (
    <div
      data-gf-tax-impact-chart=""
      className="rounded-xl border border-[var(--gf-border-subtle)] p-3"
    >
      <p className={gfType.caption}>{label}</p>
      <p className={gfType.cardTitle}>
        {value == null ? "indisponível" : value.toLocaleString("pt-BR")}
      </p>
    </div>
  );
}

export function GFTaxMonthlyProjection({
  rows,
}: {
  rows: Array<{ period: string; amount: number | null }>;
}) {
  return (
    <ul data-gf-tax-monthly-projection="" className="space-y-1 text-xs">
      {rows.length === 0 ? (
        <li>Sem projeção mensal — premissas insuficientes</li>
      ) : (
        rows.map((r) => (
          <li key={r.period}>
            {r.period}: {r.amount ?? "n/d"}
          </li>
        ))
      )}
    </ul>
  );
}

export function GFTaxSimulationTrace({ steps }: { steps: string[] }) {
  return (
    <ol
      data-gf-tax-simulation-trace=""
      className={cn(gfType.caption, "list-decimal pl-4")}
    >
      {steps.map((s) => (
        <li key={s}>{s}</li>
      ))}
    </ol>
  );
}

export function GFTaxSimulationExport() {
  return (
    <div data-gf-tax-simulation-export="" className="flex flex-wrap gap-2">
      {["CSV", "Excel", "PDF", "Imprimir"].map((f) => (
        <button
          key={f}
          type="button"
          className="rounded-lg border border-[var(--gf-border-subtle)] px-2 py-1 text-xs"
        >
          {f}
        </button>
      ))}
    </div>
  );
}
