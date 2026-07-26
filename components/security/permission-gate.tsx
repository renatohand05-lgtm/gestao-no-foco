"use client";

import type { ReactNode } from "react";

import {
  authorize,
  hasAllPermissions,
  hasAnyPermission,
  type AuthorizeOptions,
  type UserAuthorizationContext,
} from "@/lib/rbac";

type PermissionGateProps = {
  context: UserAuthorizationContext | null | undefined;
  /** Uma permissão. */
  permission?: string;
  /** Qualquer uma das permissões. */
  anyOf?: ReadonlyArray<string>;
  /** Todas as permissões. */
  allOf?: ReadonlyArray<string>;
  children: ReactNode;
  /** Conteúdo quando negado (default: null — sem layout shift forçado). */
  fallback?: ReactNode;
  /** Quando true, renderiza fallback mesmo se children vazios. */
  showFallbackOnDeny?: boolean;
  resourceTenantId?: string | null;
  policyIds?: ReadonlyArray<string>;
};

function isAllowed(
  context: UserAuthorizationContext | null | undefined,
  props: Pick<
    PermissionGateProps,
    "permission" | "anyOf" | "allOf" | "resourceTenantId" | "policyIds"
  >,
): boolean {
  const options: AuthorizeOptions = {
    resourceTenantId: props.resourceTenantId,
    policyIds: props.policyIds,
  };

  if (props.allOf && props.allOf.length > 0) {
    return hasAllPermissions(context, props.allOf, options);
  }
  if (props.anyOf && props.anyOf.length > 0) {
    return hasAnyPermission(context, props.anyOf, options);
  }
  if (props.permission) {
    return authorize(context, props.permission, options).allowed;
  }
  return false;
}

/**
 * Gate de permissão — comportamento determinístico · deny-by-default.
 *
 * @example
 * <PermissionGate context={ctx} permission="financeiro.editar">
 *   <EditarPagamentoButton />
 * </PermissionGate>
 */
export function PermissionGate({
  context,
  permission,
  anyOf,
  allOf,
  children,
  fallback = null,
  showFallbackOnDeny = true,
  resourceTenantId,
  policyIds,
}: PermissionGateProps) {
  const allowed = isAllowed(context, {
    permission,
    anyOf,
    allOf,
    resourceTenantId,
    policyIds,
  });

  if (allowed) return <>{children}</>;
  if (!showFallbackOnDeny) return null;
  return <>{fallback}</>;
}
