import Link from "next/link";
import { type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DsIcon, DsIconBox } from "@/components/ui/ds-icon";
import { dsElevation, dsLayout, dsPadding, dsType } from "@/lib/design-system";
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
        "flex flex-col items-center justify-center text-center",
        dsElevation.empty,
        dsPadding.empty,
        className,
      )}
    >
      <DsIconBox icon={Icon} variant="lg" iconSize="lg" />
      <h3 className={dsType.sectionTitle}>{title}</h3>
      <p className={cn("mt-2", dsLayout.prose, dsType.description)}>
        {description}
      </p>
      {impact ? (
        <p className={cn("mt-2 max-w-md", dsType.description)}>
          Impacto no Dashboard: {impact}
        </p>
      ) : null}
      {action ? (
        action.href ? (
          <Button className="mt-6" render={<Link href={action.href} />}>
            {action.icon ? (
              <DsIcon icon={action.icon} size="md" className="mr-2" />
            ) : null}
            {action.label}
          </Button>
        ) : (
          <Button className="mt-6" onClick={action.onClick}>
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
