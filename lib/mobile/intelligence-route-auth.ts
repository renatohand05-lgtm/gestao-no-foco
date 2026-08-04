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
import type { TenantSegment } from "@/types";

export type IntelligenceRouteAuth = {
  user: User;
  supabase: SupabaseClient<Database>;
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  segment: TenantSegment | null;
  displayName: string | null;
  permissions: string[];
  role: TenantRole | string;
  branchId: string | null;
  branchName: string | null;
};

function headerOrNull(request: Request, name: string): string | null {
  const v = request.headers.get(name)?.trim();
  return v && v.length > 0 ? v : null;
}

export async function authorizeIntelligenceRoute(
  request: Request,
  tenantId: string,
): Promise<
  { ok: true; ctx: IntelligenceRouteAuth } | { ok: false; response: NextResponse }
> {
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
      .select("id, slug, name, segment")
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

    const { data: profile } = await auth.supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", auth.user.id)
      .maybeSingle();

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
        segment: (tenant.segment as TenantSegment | null) ?? null,
        displayName:
          profile?.full_name ?? profile?.email ?? auth.user.email ?? null,
        permissions: resolved.permissions,
        role: resolved.role,
        branchId: headerOrNull(request, "x-gof-branch-id"),
        branchName: headerOrNull(request, "x-gof-branch-name"),
      },
    };
  } catch (err) {
    return {
      ok: false,
      response: mobileError(mapDatabaseErrorToUserMessage(err)),
    };
  }
}

export function intelligenceForbiddenOrError(err: unknown): NextResponse {
  if (err instanceof Error && err.message === "FORBIDDEN_EXECUTIVE") {
    return mobileForbidden(
      "Sem permissão para Inteligência Executiva neste tenant",
    );
  }
  return mobileError(mapDatabaseErrorToUserMessage(err));
}
