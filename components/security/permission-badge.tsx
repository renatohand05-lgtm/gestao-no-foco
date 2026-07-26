"use client";

import { ExecutiveBadge } from "@/components/executive";
import { getPermission, isKnownPermission } from "@/lib/rbac";
import { cn } from "@/lib/utils";

type PermissionBadgeProps = {
  permission: string;
  className?: string;
  /** Exibe a chave técnica (default: descrição amigável). */
  showKey?: boolean;
};

/**
 * Badge visual de permissão (metadados do catálogo).
 */
export function PermissionBadge({
  permission,
  className,
  showKey = false,
}: PermissionBadgeProps) {
  const known = isKnownPermission(permission);
  const meta = known ? getPermission(permission) : undefined;
  const label = showKey
    ? permission
    : (meta?.description ?? permission);

  const tone =
    meta?.risk === "critico" || meta?.risk === "alto"
      ? "warning"
      : meta?.category === "leitura"
        ? "info"
        : "neutral";

  return (
    <ExecutiveBadge
      tone={tone}
      variant="outline"
      className={cn("max-w-full", className)}
    >
      <span className="truncate" title={permission}>
        {label}
      </span>
    </ExecutiveBadge>
  );
}
