/**
 * Sprint 21.1 — Políticas compostas / contextuais.
 */

import { isSystemRole } from "./roles.ts";
import type {
  AuthorizeOptions,
  Policy,
  UserAuthorizationContext,
} from "./types.ts";

function hasRole(context: UserAuthorizationContext, role: string): boolean {
  return context.roles.some((r) => r === role);
}

function isPlatformAdmin(context: UserAuthorizationContext): boolean {
  return hasRole(context, "super_admin") && context.platformScope === true;
}

/**
 * Exige tenantId no contexto, salvo super_admin com platformScope.
 */
export const requireTenantPolicy: Policy = {
  id: "require_tenant",
  name: "Tenant obrigatório",
  description: "Nega quando tenantId está ausente (exceto platform admin).",
  evaluate(context) {
    if (isPlatformAdmin(context)) return true;
    if (!context.tenantId || context.tenantId.trim() === "") return false;
    return null;
  },
};

/**
 * Isolamento multiempresa: recurso deve pertencer ao tenant do contexto.
 */
export const tenantIsolationPolicy: Policy = {
  id: "tenant_isolation",
  name: "Isolamento de tenant",
  description: "Nega vazamento cross-tenant; proprietário só no próprio tenant.",
  evaluate(context, _permission, options) {
    if (isPlatformAdmin(context)) return true;

    const resourceTenant = options?.resourceTenantId;
    if (resourceTenant == null || resourceTenant === "") return null;

    if (!context.tenantId || context.tenantId !== resourceTenant) {
      return false;
    }
    return true;
  },
};

/**
 * Aprovação sensível: apenas proprietário ou diretor (além de quem já tem a permissão).
 * Política não concede — apenas restringe se marcada via policyIds.
 */
export const ownerOrDirectorApprovalPolicy: Policy = {
  id: "owner_or_director_approval",
  name: "Aprovação proprietário/diretor",
  description: "Ação liberada apenas para proprietário ou diretor no tenant.",
  evaluate(context) {
    if (isPlatformAdmin(context)) return true;
    if (hasRole(context, "proprietario") || hasRole(context, "diretor")) {
      return true;
    }
    return false;
  },
};

/**
 * Visualização permitida ≠ exclusão: bloqueia ações destrutivas para visualizacao/auditor.
 * Aplicada sob demanda via policyIds (não global).
 */
export const noDestructiveForReadRolesPolicy: Policy = {
  id: "no_destructive_read_roles",
  name: "Sem destruição para papéis de leitura",
  description: "Auditor e visualização não podem excluir/aprovar/cancelar.",
  evaluate(context, permission) {
    const readOnly = context.roles.every(
      (r) => r === "auditor" || r === "visualizacao",
    );
    if (!readOnly) return null;

    const destructive =
      permission.includes(".excluir") ||
      permission.includes(".aprovar") ||
      permission.includes(".cancelar") ||
      permission.includes(".desativar") ||
      permission.includes(".atribuir");

    if (destructive) return false;
    return null;
  },
};

export const DEFAULT_POLICIES: readonly Policy[] = [
  requireTenantPolicy,
  tenantIsolationPolicy,
];

export const POLICY_BY_ID: ReadonlyMap<string, Policy> = new Map(
  [
    requireTenantPolicy,
    tenantIsolationPolicy,
    ownerOrDirectorApprovalPolicy,
    noDestructiveForReadRolesPolicy,
  ].map((p) => [p.id, p]),
);

export function resolvePolicies(
  policyIds?: ReadonlyArray<string>,
): readonly Policy[] {
  if (!policyIds || policyIds.length === 0) return DEFAULT_POLICIES;
  const extra: Policy[] = [];
  for (const id of policyIds) {
    const p = POLICY_BY_ID.get(id);
    if (p && !DEFAULT_POLICIES.some((d) => d.id === p.id)) {
      extra.push(p);
    }
  }
  return [...DEFAULT_POLICIES, ...extra];
}

export function evaluatePolicies(
  context: UserAuthorizationContext,
  permission: string,
  options?: AuthorizeOptions,
  policyIds?: ReadonlyArray<string>,
): { allowed: boolean | null; policyId: string | null } {
  for (const policy of resolvePolicies(policyIds ?? options?.policyIds)) {
    const result = policy.evaluate(context, permission, options);
    if (result === false) {
      return { allowed: false, policyId: policy.id };
    }
  }
  // Se require_tenant negou via false já retornou; null = não bloqueia
  return { allowed: null, policyId: null };
}

export function isKnownSystemRole(role: string): boolean {
  return isSystemRole(role);
}
