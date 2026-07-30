/**
 * Sprint 22.2 RC2 — Auth de páginas Enterprise Financeiro.
 */

import { getCurrentProfile } from "@/lib/auth/session";
import {
  createEnterpriseContext,
  createRbacSupabaseAdapter,
} from "@/lib/enterprise";
import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/lib/tenants";
import type { FinancePermission } from "@/lib/finance/shared/types";
import {
  assertFinanceAccess,
  assertFinancePermission,
  resolveFinanceEffectivePermissions,
} from "@/lib/finance/shared/rbac";
import { FINANCE_ERROR_CODES, FinanceError } from "@/lib/finance/shared/errors";

export async function resolveFinancePageAuth(tenantSlug: string) {
  const tenant = await requireTenant(tenantSlug);
  const profile = await getCurrentProfile();
  if (!profile?.id) {
    throw new FinanceError(
      "Sessão ausente.",
      FINANCE_ERROR_CODES.PERMISSION_DENIED,
    );
  }

  const client = await createClient();
  const rbac = createRbacSupabaseAdapter(client);
  const snap = await rbac.resolveAuthorizationSnapshot(tenant.id, profile.id);
  const effective = resolveFinanceEffectivePermissions({
    membershipRole: tenant.role,
    snapshotRoles: snap.roles,
    snapshotPermissions: snap.permissions,
  });
  assertFinanceAccess(effective.permissions);

  const context = createEnterpriseContext({
    tenantId: tenant.id,
    userId: profile.id,
    roles: effective.roles,
    permissions: effective.permissions,
    source: "server_action",
    metadata: {
      financeAuthSource: effective.source,
      membershipRole: tenant.role,
    },
  });

  return { tenant, context, profile };
}

export async function requireFinancePagePermission(
  tenantSlug: string,
  required: FinancePermission | FinancePermission[],
) {
  const auth = await resolveFinancePageAuth(tenantSlug);
  assertFinancePermission(auth.context.permissions, required);
  return auth;
}

export function financePageAuthError(error: unknown): {
  message: string;
  code?: string;
} {
  if (error instanceof FinanceError) {
    return { message: error.message, code: error.code };
  }
  if (error instanceof Error) return { message: error.message };
  return { message: "Erro de autorização financeira." };
}

export async function tryRequireFinancePagePermission(
  tenantSlug: string,
  required: FinancePermission | FinancePermission[],
) {
  try {
    return {
      ok: true as const,
      auth: await requireFinancePagePermission(tenantSlug, required),
    };
  } catch (error) {
    return { ok: false as const, error: financePageAuthError(error) };
  }
}
