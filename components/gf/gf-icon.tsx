"use client";

import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type GfIconVariant =
  | "primary"
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "intelligence";

type Props = {
  icon: LucideIcon;
  variant?: GfIconVariant;
  active?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
};

const variantClass: Record<GfIconVariant, string> = {
  primary:
    "bg-[var(--brand-gold)]/12 text-[var(--brand-gold)] ring-1 ring-[var(--brand-gold)]/20",
  neutral:
    "bg-[var(--gf-surface-interactive)] text-[var(--text-secondary)] ring-1 ring-[var(--gf-border-subtle)]",
  success: "bg-success/12 text-success ring-1 ring-success/25",
  warning: "bg-warning/12 text-warning ring-1 ring-warning/25",
  danger: "bg-danger/12 text-danger ring-1 ring-danger/25",
  intelligence:
    "bg-[var(--brand-gold)]/10 text-[var(--brand-gold-soft)] ring-1 ring-[var(--brand-gold)]/30 shadow-[var(--gf-glow-gold)]",
};

const sizeClass = {
  sm: "size-7 [&_svg]:size-3.5",
  md: "size-9 [&_svg]:size-4",
  lg: "size-11 [&_svg]:size-5",
} as const;

/**
 * Wrapper visual proprietário — padroniza ícones Lucide (Sprint 26.2).
 */
export function GFIcon({
  icon: Icon,
  variant = "primary",
  active = false,
  size = "md",
  className,
  label,
}: Props) {
  return (
    <span
      className={cn(
        "gf-icon inline-flex shrink-0 items-center justify-center rounded-xl",
        "transition-[box-shadow,background-color,transform] duration-[var(--gf-motion-micro)] ease-[var(--gf-ease)]",
        sizeClass[size],
        variantClass[variant],
        active && "ring-[var(--gf-border-active)] shadow-[var(--gf-glow-gold)]",
        className,
      )}
      data-gf-icon=""
      data-gf-icon-variant={variant}
      data-gf-icon-active={active ? "1" : "0"}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
    >
      <Icon strokeWidth={1.75} />
    </span>
  );
}
