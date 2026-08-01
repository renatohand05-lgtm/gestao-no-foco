"use client";

import type { TaxRule, TaxRuleStatus } from "@/lib/tax/types";
import { workflowActionsFor } from "@/lib/tax/workflow";
import { gfType } from "@/lib/design-system/signature";
import { cn } from "@/lib/utils";
import Link from "next/link";

export function GFTaxWorkflowStatus({ status }: { status: TaxRuleStatus }) {
  return (
    <span
      data-gf-tax-workflow-status={status}
      className={cn(
        "rounded-md border border-[var(--gf-border-subtle)] px-2 py-0.5 text-[10px] uppercase tracking-wide",
        "text-[var(--text-secondary)]",
      )}
    >
      {status}
    </span>
  );
}

export function GFTaxRuleTable({
  rules,
  tenantSlug,
}: {
  rules: Array<Pick<TaxRule, "id" | "code" | "name" | "status" | "version" | "validFrom" | "sourceReference">>;
  tenantSlug: string;
}) {
  if (rules.length === 0) {
    return (
      <p className={gfType.body} data-gf-tax-rule-table-empty="">
        Nenhuma regra cadastrada. Cadastre drafts com fonte e vigência — sem
        alíquotas inventadas.
      </p>
    );
  }
  return (
    <ul className="space-y-2" data-gf-tax-rule-table="">
      {rules.map((r) => (
        <li
          key={r.id}
          className="rounded-xl border border-[var(--gf-border-subtle)] p-3"
          data-tax-rule-row={r.id}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className={gfType.cardTitle}>
                {r.code} · {r.name}
              </p>
              <p className={gfType.caption}>
                v{r.version} · desde {r.validFrom} · fonte {r.sourceReference}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <GFTaxWorkflowStatus status={r.status} />
              <Link
                href={`/${tenantSlug}/tributario/regras/${r.id}`}
                className="text-xs text-[var(--brand-gold)] hover:underline"
              >
                Abrir
              </Link>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function GFTaxRuleEditor({
  disabled,
}: {
  disabled?: boolean;
}) {
  return (
    <div
      data-gf-tax-rule-editor=""
      className="space-y-3 rounded-xl border border-[var(--gf-border-subtle)] p-4"
    >
      <p className={gfType.sectionTitle}>Editor de regra (draft)</p>
      <p className={gfType.caption}>
        Campos canônicos · fonte obrigatória · vigência obrigatória · sem
        hardcode de alíquota no frontend.
      </p>
      <fieldset disabled={disabled} className="grid gap-2 sm:grid-cols-2">
        <label className="text-xs">
          Código
          <input
            name="code"
            className="mt-1 w-full rounded-lg border border-[var(--gf-border-subtle)] bg-[var(--gf-surface-raised)] px-2 py-1.5 text-sm"
            placeholder="ex.: ICMS-UF-SCOPE"
          />
        </label>
        <label className="text-xs">
          Nome
          <input
            name="name"
            className="mt-1 w-full rounded-lg border border-[var(--gf-border-subtle)] bg-[var(--gf-surface-raised)] px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs sm:col-span-2">
          Fonte (obrigatória)
          <input
            name="sourceReference"
            required
            className="mt-1 w-full rounded-lg border border-[var(--gf-border-subtle)] bg-[var(--gf-surface-raised)] px-2 py-1.5 text-sm"
            placeholder="Referência documental / norma / parametrização interna"
          />
        </label>
        <label className="text-xs">
          Vigência início
          <input
            type="date"
            name="validFrom"
            required
            className="mt-1 w-full rounded-lg border border-[var(--gf-border-subtle)] bg-[var(--gf-surface-raised)] px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs">
          Vigência fim
          <input
            type="date"
            name="validTo"
            className="mt-1 w-full rounded-lg border border-[var(--gf-border-subtle)] bg-[var(--gf-surface-raised)] px-2 py-1.5 text-sm"
          />
        </label>
      </fieldset>
      <p className={gfType.caption}>
        Publicação exige workflow (revisão → aprovação) e permissão server-side.
      </p>
    </div>
  );
}

export function GFTaxRuleVersionDiff({
  changedFields,
  changeReason,
}: {
  changedFields: string[];
  changeReason: string;
}) {
  return (
    <div data-gf-tax-rule-version-diff="" className="space-y-2">
      <p className={gfType.sectionTitle}>Diff de versão</p>
      <p className={gfType.caption}>Motivo: {changeReason || "—"}</p>
      <ul className={cn(gfType.caption, "list-disc pl-4")}>
        {changedFields.length === 0 ? (
          <li>Sem campos alterados</li>
        ) : (
          changedFields.map((f) => <li key={f}>{f}</li>)
        )}
      </ul>
    </div>
  );
}

export function GFTaxScopeSelector() {
  return (
    <div data-gf-tax-scope-selector="" className="grid gap-2 sm:grid-cols-3">
      {["empresa", "filial", "UF", "município", "CNAE", "NCM", "CFOP"].map(
        (l) => (
          <label key={l} className="text-xs">
            {l}
            <input
              className="mt-1 w-full rounded-lg border border-[var(--gf-border-subtle)] bg-[var(--gf-surface-raised)] px-2 py-1.5 text-sm"
              placeholder="opcional"
            />
          </label>
        ),
      )}
    </div>
  );
}

export function GFTaxValidityEditor() {
  return (
    <div data-gf-tax-validity-editor="" className="flex flex-wrap gap-2">
      <label className="text-xs">
        De
        <input
          type="date"
          className="mt-1 block rounded-lg border border-[var(--gf-border-subtle)] px-2 py-1.5 text-sm"
        />
      </label>
      <label className="text-xs">
        Até
        <input
          type="date"
          className="mt-1 block rounded-lg border border-[var(--gf-border-subtle)] px-2 py-1.5 text-sm"
        />
      </label>
    </div>
  );
}

export function GFTaxSourceReference({ source }: { source: string | null }) {
  return (
    <p data-gf-tax-source-reference="" className={gfType.caption}>
      Fonte: {source?.trim() ? source : "ausente — publicação bloqueada"}
    </p>
  );
}

export function GFTaxCalculationTrace({
  steps,
  limitations,
}: {
  steps: string[];
  limitations: string[];
}) {
  return (
    <div data-gf-tax-calculation-trace="" className="space-y-2">
      <p className={gfType.sectionTitle}>Trace de cálculo</p>
      <ol className={cn(gfType.caption, "list-decimal pl-4")}>
        {steps.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
      {limitations.length > 0 ? (
        <ul className={cn(gfType.caption, "list-disc pl-4 text-destructive")}>
          {limitations.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function GFTaxAuditTimeline({
  events,
}: {
  events: Array<{ id: string; action: string; createdAt: string; actorId: string }>;
}) {
  if (events.length === 0) {
    return (
      <p data-gf-tax-audit-timeline="" className={gfType.body}>
        Sem eventos de auditoria persistidos (migration pendente ou vazio).
      </p>
    );
  }
  return (
    <ul data-gf-tax-audit-timeline="" className="space-y-2">
      {events.map((e) => (
        <li
          key={e.id}
          className="rounded-lg border border-[var(--gf-border-subtle)] p-2 text-xs"
        >
          {e.createdAt} · {e.action} · ator {e.actorId}
        </li>
      ))}
    </ul>
  );
}

export function GFTaxWorkflowActions({ status }: { status: TaxRuleStatus }) {
  const actions = workflowActionsFor(status);
  return (
    <div data-gf-tax-workflow-actions="" className="flex flex-wrap gap-1.5">
      {actions.map((a) => (
        <span
          key={a}
          className="rounded-md border border-[var(--gf-border-subtle)] px-2 py-1 text-[10px] uppercase"
        >
          {a}
        </span>
      ))}
    </div>
  );
}
