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
  secondaryAction?: {
    label: string;
    href?: string;
    onClick?: () => void;
    icon?: LucideIcon;
  };
  className?: string;
};

/**
 * Empty state padronizado — identidade GESTÃO (Gate 19.4 · refinado 26.3).
 */
function EmptyStateButton({
  action,
  className,
  variant = "default",
}: {
  action: NonNullable<EmptyStateProps["action"]>;
  className?: string;
  variant?: "default" | "outline";
}) {
  if (action.href) {
    return (
      <Button
        className={className}
        variant={variant}
        render={<Link href={action.href} />}
      >
        {action.icon ? (
          <DsIcon icon={action.icon} size="md" className="mr-2" />
        ) : null}
        {action.label}
      </Button>
    );
  }
  return (
    <Button className={className} variant={variant} onClick={action.onClick}>
      {action.icon ? (
        <DsIcon icon={action.icon} size="md" className="mr-2" />
      ) : null}
      {action.label}
    </Button>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  impact,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center border border-border bg-card px-6 py-12 text-center shadow-[var(--elevation-card)]",
        gofRadius.lg,
        gofMotion.fade,
        className,
      )}
      role="status"
      data-empty-state=""
      data-sprint="26.3"
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
      {action || secondaryAction ? (
        <div className="mt-6 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          {action ? (
            <EmptyStateButton action={action} className="min-h-11" />
          ) : null}
          {secondaryAction ? (
            <EmptyStateButton
              action={secondaryAction}
              className="min-h-11"
              variant="outline"
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
