import { cn } from "@/lib/utils";
import { gfSpace, gfType } from "@/lib/design-system/signature";

type Props = {
  title?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
};

/**
 * Barra de filtros padronizada (Sprint 26.6) — layout/espaço apenas.
 */
export function GFFilterBar({ title, children, actions, className }: Props) {
  return (
    <div
      data-gf-filter-bar=""
      data-sprint="26.6"
      className={cn(
        "flex flex-col gap-[var(--gf-space-tight)] rounded-[var(--gf-radius)]",
        "border border-[var(--gf-border-subtle)] bg-[var(--gf-surface-raised)] p-3",
        "shadow-[var(--gf-shadow-soft)] sm:flex-row sm:flex-wrap sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className={cn("min-w-0 flex-1", gfSpace.stackTight)}>
        {title ? <p className={gfType.label}>{title}</p> : null}
        <div className="flex flex-wrap items-center gap-2">{children}</div>
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
