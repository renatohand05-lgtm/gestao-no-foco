import {
  authenticateMobileRequest,
  isMobileAuthFailure,
} from "@/lib/mobile/auth-request";
import { composeMobileExecutiveDashboard } from "@/lib/mobile/dashboard-compose";
import { getActiveMembership } from "@/lib/mobile/membership";
import { resolveMobilePermissions } from "@/lib/mobile/permissions";
import {
  mobileError,
  mobileForbidden,
  mobileJson,
  mobileUnauthorized,
} from "@/lib/mobile/response";
import { mapDatabaseErrorToUserMessage } from "@/lib/supabase/friendly-error";
import type { TenantSegment } from "@/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ tenantId: string }> };

function headerOrNull(request: Request, name: string): string | null {
  const v = request.headers.get(name)?.trim();
  return v && v.length > 0 ? v : null;
}

/** GET /api/mobile/v1/tenants/:tenantId/dashboard */
export async function GET(request: Request, context: RouteContext) {
  const auth = await authenticateMobileRequest(request);
  if (isMobileAuthFailure(auth)) {
    return mobileUnauthorized(auth.message);
  }

  const { tenantId } = await context.params;
  const branchId = headerOrNull(request, "x-gof-branch-id");
  const branchName = headerOrNull(request, "x-gof-branch-name");

  try {
    const membership = await getActiveMembership(
      auth.supabase,
      tenantId,
      auth.user.id,
    );
    if (!membership) {
      return mobileForbidden("Você não pertence a esta empresa");
    }

    const { data: tenant, error: tenantError } = await auth.supabase
      .from("tenants")
      .select("id, slug, name, segment, segment_version, segment_config")
      .eq("id", tenantId)
      .maybeSingle();

    if (tenantError) {
      return mobileError(mapDatabaseErrorToUserMessage(tenantError));
    }
    if (!tenant) {
      return mobileForbidden("Empresa não encontrada");
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

    const dto = await composeMobileExecutiveDashboard({
      userClient: auth.supabase,
      tenantId,
      tenantSlug: tenant.slug,
      tenantName: tenant.name,
      segment: (tenant.segment as TenantSegment | null) ?? null,
      segmentVersion:
        (tenant as { segment_version?: number | null }).segment_version ?? null,
      segmentConfig:
        (tenant as { segment_config?: unknown }).segment_config ?? {},
      displayName: profile?.full_name ?? profile?.email ?? auth.user.email ?? null,
      branchId,
      branchName,
      permissions: resolved.permissions,
    });

    return mobileJson(dto);
  } catch (err) {
    if (err instanceof Error && err.message === "FORBIDDEN_EXECUTIVE") {
      return mobileForbidden(
        "Sem permissão para o Dashboard Executivo neste tenant",
      );
    }
    return mobileError(mapDatabaseErrorToUserMessage(err));
  }
}
