import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { Inbox } from "lucide-react";

import { GFButton } from "@/components/gf/gf-button";
import { GFIcon } from "@/components/gf/gf-icon";
import { gfMotion, gfType } from "@/lib/design-system/signature";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  description: string;
  icon?: LucideIcon;
  impact?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  className?: string;
};

/**
 * Empty state Signature — tipografia/espaço GF (Sprint 26.3).
 * Não altera paleta; usa tokens aprovados.
 */
export function GFEmptyState({
  title,
  description,
  icon = Inbox,
  impact,
  action,
  className,
}: Props) {
  return (
    <div
      role="status"
      data-gf-empty-state=""
      data-sprint="26.3"
      className={cn(
        "gf-empty-state flex flex-col items-center justify-center rounded-[var(--gf-radius)]",
        "border border-[var(--gf-border-subtle)] bg-[var(--gf-surface-raised)]",
        "px-6 py-12 text-center shadow-[var(--gf-shadow-soft)]",
        gfMotion.enter,
        className,
      )}
    >
      <GFIcon icon={icon} size="lg" variant="neutral" />
      <h3 className={cn(gfType.sectionTitle, "mt-4")}>{title}</h3>
      <p className={cn(gfType.body, "mt-2 max-w-md text-pretty")}>{description}</p>
      {impact ? (
        <p className={cn(gfType.caption, "mt-2 max-w-md")}>Impacto: {impact}</p>
      ) : null}
      {action ? (
        action.href ? (
          <GFButton className="mt-6 min-h-11" render={<Link href={action.href} />}>
            {action.label}
          </GFButton>
        ) : (
          <GFButton className="mt-6 min-h-11" onClick={action.onClick}>
            {action.label}
          </GFButton>
        )
      ) : null}
    </div>
  );
}
