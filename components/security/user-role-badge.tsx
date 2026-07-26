"use client";

import { ExecutiveBadge } from "@/components/executive";
import { getRole, isSystemRole } from "@/lib/rbac";
import { cn } from "@/lib/utils";

type UserRoleBadgeProps = {
  role: string;
  className?: string;
};

/**
 * Badge visual de papel do usuário.
 */
export function UserRoleBadge({ role, className }: UserRoleBadgeProps) {
  const meta = isSystemRole(role) ? getRole(role) : undefined;
  const label = meta?.name ?? role;

  const tone =
    role === "super_admin"
      ? "danger"
      : role === "proprietario" || role === "diretor"
        ? "primary"
        : role === "auditor"
          ? "info"
          : "neutral";

  return (
    <ExecutiveBadge
      tone={tone}
      variant="soft"
      className={cn("max-w-full", className)}
    >
      <span className="truncate" title={meta?.description ?? role}>
        {label}
      </span>
    </ExecutiveBadge>
  );
}
