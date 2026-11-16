"use client";

import { useState } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  gofMotion,
  gofTypography,
} from "@/lib/design-system/foundation";
import { gofGrid, gofSurface } from "@/lib/design-system/layout";

type Props = {
  children: React.ReactNode;
  className?: string;
  label?: string;
  actions?: React.ReactNode;
  /**
   * Celular: recolhe os filtros. Só os campos marcados com `primaryOnMobile`
   * ficam à vista; o resto abre no botão "Mais filtros".
   */
  mobileCollapse?: boolean;
  /** Quantidade de filtros ativos (aparece como selo no botão). */
  activeCount?: number;
};

/**
 * ExecutiveFilter — container de filtros (Gate 19.0.2).
 * Sem aplicar filtros / URL / services.
 */
export function ExecutiveFilter({
  children,
  className,
  label,
  actions,
  mobileCollapse = false,
  activeCount = 0,
}: Props) {
  const [open, setOpen] = useState(false);
  const collapsed = mobileCollapse && !open;

  return (
    <div
      className={cn(gofSurface.inset, "p-4", gofMotion.fade, className)}
      role="search"
      aria-label={label ?? "Filtros"}
    >
      {(label || actions || mobileCollapse) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          {label ? (
            <p className={cn(gofTypography.caption, "font-semibold")}>{label}</p>
          ) : (
            <span />
          )}
          {mobileCollapse ? (
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpen((value) => !value)}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-transparent px-3 text-sm font-medium md:hidden"
            >
              <SlidersHorizontal className="size-4" aria-hidden />
              {open ? "Ocultar filtros" : "Mais filtros"}
              {activeCount > 0 ? (
                <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-[var(--brand-gold)] px-1.5 text-xs font-bold text-[#0a1428]">
                  {activeCount}
                </span>
              ) : null}
              <ChevronDown
                className={cn("size-4 transition-transform", open && "rotate-180")}
                aria-hidden
              />
            </button>
          ) : null}
          {actions ? (
            <div className={cn(mobileCollapse && "max-md:hidden")}>
              {actions}
            </div>
          ) : null}
        </div>
      )}
      <div
        className={cn(
          gofGrid.filters,
          mobileCollapse &&
            "max-md:data-[collapsed=true]:[&>label:not([data-primary])]:hidden",
        )}
        data-collapsed={collapsed ? "true" : "false"}
      >
        {children}
      </div>
      {mobileCollapse && actions ? (
        <div className="mt-3 md:hidden">{actions}</div>
      ) : null}
    </div>
  );
}

type FieldProps = {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
  /** Com `mobileCollapse`, mantém este campo visível no celular. */
  primaryOnMobile?: boolean;
};

export function ExecutiveFilterField({
  label,
  htmlFor,
  children,
  className,
  primaryOnMobile = false,
}: FieldProps) {
  return (
    <label
      htmlFor={htmlFor}
      data-primary={primaryOnMobile ? "" : undefined}
      className={cn("flex min-w-0 flex-col gap-1.5", className)}
    >
      <span className={gofTypography.caption}>{label}</span>
      {children}
    </label>
  );
}
