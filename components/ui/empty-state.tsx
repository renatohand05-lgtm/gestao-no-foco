import Link from "next/link";
import { type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DsIcon, DsIconBox } from "@/components/ui/ds-icon";
import { brandConfig } from "@/config/brand";
import { gofMotion, gofRadius, gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  /** Impacto no Dashboard / motivo (Sprint 13.12). */
  impact?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
    icon?: LucideIcon;
  };
  className?: string;
};

/**
 * Empty state padronizado — identidade GESTÃO (Gate 19.4).
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  impact,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center border border-border/50 bg-card px-6 py-12 text-center",
        gofRadius.lg,
        gofMotion.fade,
        className,
      )}
      role="status"
    >
      <p className="mb-3 text-[10px] font-medium tracking-[0.14em] text-[var(--brand-gold)] uppercase">
        {brandConfig.name}
      </p>
      <DsIconBox icon={Icon} variant="lg" iconSize="lg" />
      <h3 className={cn("mt-4", gofTypography.title)}>{title}</h3>
      <p className={cn("mt-2 max-w-md", gofTypography.subtitle)}>
        {description}
      </p>
      {impact ? (
        <p className={cn("mt-2 max-w-md", gofTypography.caption)}>
          Impacto: {impact}
        </p>
      ) : null}
      {action ? (
        action.href ? (
          <Button className="mt-6 min-h-11" render={<Link href={action.href} />}>
            {action.icon ? (
              <DsIcon icon={action.icon} size="md" className="mr-2" />
            ) : null}
            {action.label}
          </Button>
        ) : (
          <Button className="mt-6 min-h-11" onClick={action.onClick}>
            {action.icon ? (
              <DsIcon icon={action.icon} size="md" className="mr-2" />
            ) : null}
            {action.label}
          </Button>
        )
      ) : null}
    </div>
  );
}
