import {
  ExecutiveBadge,
  type ExecutiveBadgeTone,
  type ExecutiveBadgeVariant,
} from "@/components/executive/ExecutiveBadge";
import { cn } from "@/lib/utils";

type StatusBadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "secondary"
  | "outline";

type StatusBadgeProps = {
  label: string;
  variant?: StatusBadgeVariant;
  className?: string;
};

const variantMap: Record<
  StatusBadgeVariant,
  { tone: ExecutiveBadgeTone; badgeVariant: ExecutiveBadgeVariant }
> = {
  default: { tone: "primary", badgeVariant: "soft" },
  success: { tone: "success", badgeVariant: "soft" },
  warning: { tone: "warning", badgeVariant: "soft" },
  danger: { tone: "danger", badgeVariant: "soft" },
  secondary: { tone: "neutral", badgeVariant: "soft" },
  outline: { tone: "neutral", badgeVariant: "outline" },
};

/**
 * StatusBadge — wrapper do ExecutiveBadge oficial (Gate 19.6).
 * Preserva API de domínio (label + variant).
 */
export function StatusBadge({
  label,
  variant = "default",
  className,
}: StatusBadgeProps) {
  const mapped = variantMap[variant];
  return (
    <ExecutiveBadge
      tone={mapped.tone}
      variant={mapped.badgeVariant}
      className={cn(className)}
    >
      {label}
    </ExecutiveBadge>
  );
}
