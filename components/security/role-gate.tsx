"use client";

import type { ReactNode } from "react";

import {
  hasAllRoles,
  hasAnyRole,
  hasRole,
  type UserAuthorizationContext,
} from "@/lib/rbac";

type RoleGateProps = {
  context: UserAuthorizationContext | null | undefined;
  /** Uma role. */
  role?: string;
  /** Múltiplas roles. */
  roles?: ReadonlyArray<string>;
  /** any (default) | all */
  mode?: "any" | "all";
  children: ReactNode;
  fallback?: ReactNode;
  showFallbackOnDeny?: boolean;
};

function isAllowed(
  context: UserAuthorizationContext | null | undefined,
  props: Pick<RoleGateProps, "role" | "roles" | "mode">,
): boolean {
  const mode = props.mode ?? "any";
  if (props.roles && props.roles.length > 0) {
    return mode === "all"
      ? hasAllRoles(context, props.roles)
      : hasAnyRole(context, props.roles);
  }
  if (props.role) {
    return hasRole(context, props.role);
  }
  return false;
}

/**
 * Gate de papel — any/all · fallback seguro.
 */
export function RoleGate({
  context,
  role,
  roles,
  mode = "any",
  children,
  fallback = null,
  showFallbackOnDeny = true,
}: RoleGateProps) {
  const allowed = isAllowed(context, { role, roles, mode });

  if (allowed) return <>{children}</>;
  if (!showFallbackOnDeny) return null;
  return <>{fallback}</>;
}
