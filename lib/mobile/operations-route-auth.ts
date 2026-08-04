import "server-only";

import type { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";

import {
  authenticateMobileRequest,
  isMobileAuthFailure,
} from "@/lib/mobile/auth-request";
import { getActiveMembership } from "@/lib/mobile/membership";
import { resolveMobilePermissions } from "@/lib/mobile/permissions";
import {
  mobileError,
  mobileForbidden,
  mobileUnauthorized,
} from "@/lib/mobile/response";
import { mapDatabaseErrorToUserMessage } from "@/lib/supabase/friendly-error";
import type { Database } from "@/types/database";
import type { TenantRole } from "@/lib/constants";

export type OpsRouteAuth = {
  user: User;
  supabase: SupabaseClient<Database>;
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  permissions: string[];
  role: TenantRole | string;
};

export async function authorizeOpsRoute(
  request: Request,
  tenantId: string,
): Promise<{ ok: true; ctx: OpsRouteAuth } | { ok: false; response: NextResponse }> {
  const auth = await authenticateMobileRequest(request);
  if (isMobileAuthFailure(auth)) {
    return { ok: false, response: mobileUnauthorized(auth.message) };
  }

  try {
    const membership = await getActiveMembership(
      auth.supabase,
      tenantId,
      auth.user.id,
    );
    if (!membership) {
      return {
        ok: false,
        response: mobileForbidden("Você não pertence a esta empresa"),
      };
    }

    const { data: tenant, error } = await auth.supabase
      .from("tenants")
      .select("id, slug, name")
      .eq("id", tenantId)
      .maybeSingle();

    if (error) {
      return {
        ok: false,
        response: mobileError(mapDatabaseErrorToUserMessage(error)),
      };
    }
    if (!tenant) {
      return { ok: false, response: mobileForbidden("Empresa não encontrada") };
    }

    const resolved = await resolveMobilePermissions(
      auth.supabase,
      tenantId,
      auth.user.id,
      membership.role,
    );

    return {
      ok: true,
      ctx: {
        user: auth.user,
        supabase: auth.supabase,
        tenantId,
        tenantSlug: tenant.slug,
        tenantName: tenant.name,
        permissions: resolved.permissions,
        role: resolved.role,
      },
    };
  } catch (err) {
    return {
      ok: false,
      response: mobileError(mapDatabaseErrorToUserMessage(err)),
    };
  }
}

export function opsForbiddenOrError(err: unknown): NextResponse {
  if (err instanceof Error && err.message === "FORBIDDEN_OPS") {
    return mobileForbidden("Sem permissão operacional neste tenant");
  }
  return mobileError(mapDatabaseErrorToUserMessage(err));
}
