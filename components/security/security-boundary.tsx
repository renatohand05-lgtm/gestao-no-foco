"use client";

import type { ReactNode } from "react";

import type { AuthorizationDecision } from "@/lib/rbac";

type SecurityBoundaryProps = {
  /** Decisão pré-computada da camada RBAC. */
  decision: AuthorizationDecision | null | undefined;
  /** Ou flag booleana direta. */
  allowed?: boolean;
  children: ReactNode;
  fallback?: ReactNode;
};

/**
 * Boundary de segurança — renderiza conteúdo permitido ou fallback.
 * Não lança erro visual sem tratamento.
 */
export function SecurityBoundary({
  decision,
  allowed,
  children,
  fallback = null,
}: SecurityBoundaryProps) {
  const ok =
    typeof allowed === "boolean"
      ? allowed
      : decision?.allowed === true;

  if (ok) return <>{children}</>;
  return <>{fallback}</>;
}
