import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { Inbox } from "lucide-react";

import { ExecutiveButton } from "@/components/executive/ExecutiveButton";
import { DsIcon } from "@/components/ui/ds-icon";
import { brandConfig } from "@/config/brand";
import {
  gofMotion,
  gofRadius,
  gofTypography,
} from "@/lib/design-system/foundation";
import { cn } from "@/lib/utils";

type Action = {
  label: string;
  onClick?: () => void;
  href?: string;
};

type Props = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: Action;
  className?: string;
};

/**
 * ExecutiveEmptyState — identidade GESTÃO (Gate 19.4).
 */
export function ExecutiveEmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center border border-border bg-card px-6 py-12 text-center shadow-[var(--elevation-card)]",
        gofRadius.lg,
        gofMotion.fade,
        className,
      )}
      role="status"
      data-executive-empty=""
      data-sprint="26.6"
    >
      <p className="mb-3 text-[10px] font-medium tracking-[0.14em] text-[var(--brand-gold)] uppercase">
        {brandConfig.name}
      </p>
      <span
        className={cn(
          "mb-4 inline-flex size-12 items-center justify-center bg-muted text-muted-foreground",
          gofRadius.lg,
        )}
      >
        <DsIcon icon={Icon} size="lg" />
      </span>
      <h3 className={gofTypography.title}>{title}</h3>
      {description ? (
        <p className={cn("mt-2 max-w-sm", gofTypography.subtitle)}>
          {description}
        </p>
      ) : null}
      {action ? (
        action.href ? (
          <ExecutiveButton
            className="mt-6"
            render={<Link href={action.href} />}
          >
            {action.label}
          </ExecutiveButton>
        ) : (
          <ExecutiveButton className="mt-6" onClick={action.onClick}>
            {action.label}
          </ExecutiveButton>
        )
      ) : null}
    </div>
  );
}
