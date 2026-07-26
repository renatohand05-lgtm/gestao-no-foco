"use client";

import { AUDIT_CATEGORIES, AUDIT_SEVERITIES } from "@/lib/audit";
import type { AuditFilterCriteria } from "@/lib/audit";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  value?: AuditFilterCriteria;
  className?: string;
  onChange?: (next: AuditFilterCriteria) => void;
};

/**
 * Filtros estruturados de auditoria (UI apenas).
 * A aplicação dos critérios é feita em lib/audit/filters.
 */
export function AuditFilter({ value = {}, className, onChange }: Props) {
  function patch(partial: AuditFilterCriteria) {
    onChange?.({ ...value, ...partial });
  }

  return (
    <fieldset
      data-audit-filter
      className={cn(
        "grid gap-3 rounded-xl border border-border/60 bg-[var(--brand-white)] p-3 sm:grid-cols-2 lg:grid-cols-4",
        className,
      )}
    >
      <legend className={cn(gofTypography.caption, "px-1")}>
        Filtros de auditoria
      </legend>

      <label className="space-y-1 text-sm">
        <span className={gofTypography.caption}>Categoria</span>
        <select
          className="min-h-10 w-full rounded-xl border border-border bg-transparent px-2 text-sm"
          value={value.category ?? ""}
          onChange={(e) =>
            patch({ category: e.target.value || null })
          }
        >
          <option value="">Todas</option>
          {AUDIT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-1 text-sm">
        <span className={gofTypography.caption}>Severidade</span>
        <select
          className="min-h-10 w-full rounded-xl border border-border bg-transparent px-2 text-sm"
          value={value.severity ?? ""}
          onChange={(e) =>
            patch({ severity: e.target.value || null })
          }
        >
          <option value="">Todas</option>
          {AUDIT_SEVERITIES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-1 text-sm">
        <span className={gofTypography.caption}>Usuário</span>
        <input
          type="text"
          className="min-h-10 w-full rounded-xl border border-border bg-transparent px-2 text-sm"
          value={value.userId ?? ""}
          placeholder="userId"
          onChange={(e) =>
            patch({ userId: e.target.value.trim() || null })
          }
        />
      </label>

      <label className="space-y-1 text-sm">
        <span className={gofTypography.caption}>Correlation ID</span>
        <input
          type="text"
          className="min-h-10 w-full rounded-xl border border-border bg-transparent px-2 text-sm"
          value={value.correlationId ?? ""}
          placeholder="correlationId"
          onChange={(e) =>
            patch({ correlationId: e.target.value.trim() || null })
          }
        />
      </label>
    </fieldset>
  );
}
