import {
  authenticateMobileRequest,
  isMobileAuthFailure,
} from "@/lib/mobile/auth-request";
import { getActiveMembership } from "@/lib/mobile/membership";
import { resolveMobilePermissions } from "@/lib/mobile/permissions";
import {
  mobileError,
  mobileForbidden,
  mobileJson,
  mobileUnauthorized,
} from "@/lib/mobile/response";
import {
  composeMobileGlobalSearch,
  MOBILE_SEARCH_MAX_LIMIT,
  MOBILE_SEARCH_MIN_Q,
} from "@/lib/mobile/search-compose";
import { mapDatabaseErrorToUserMessage } from "@/lib/supabase/friendly-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ tenantId: string }> };

/** GET /api/mobile/v1/tenants/:tenantId/search?q=&types=&limit=&cursor=&branchId= */
export async function GET(request: Request, context: RouteContext) {
  const auth = await authenticateMobileRequest(request);
  if (isMobileAuthFailure(auth)) {
    return mobileUnauthorized(auth.message);
  }

  const { tenantId } = await context.params;
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const typesRaw = url.searchParams.get("types");
  const limitRaw = url.searchParams.get("limit");
  const cursor = url.searchParams.get("cursor");
  const types = typesRaw
    ? typesRaw.split(",").map((t) => t.trim()).filter(Boolean)
    : null;
  const limit = limitRaw ? Number(limitRaw) : undefined;

  if (q.length > 0 && q.length < MOBILE_SEARCH_MIN_Q) {
    return mobileError(`Informe ao menos ${MOBILE_SEARCH_MIN_Q} caracteres`, 400);
  }
  if (limit != null && (!Number.isFinite(limit) || limit < 1 || limit > MOBILE_SEARCH_MAX_LIMIT)) {
    return mobileError(`limit inválido (1–${MOBILE_SEARCH_MAX_LIMIT})`, 400);
  }

  try {
    const membership = await getActiveMembership(
      auth.supabase,
      tenantId,
      auth.user.id,
    );
    if (!membership) {
      return mobileForbidden("Você não pertence a esta empresa");
    }

    const { data: tenant, error } = await auth.supabase
      .from("tenants")
      .select("id, slug")
      .eq("id", tenantId)
      .maybeSingle();
    if (error) return mobileError(mapDatabaseErrorToUserMessage(error));
    if (!tenant) return mobileForbidden("Empresa não encontrada");

    const resolved = await resolveMobilePermissions(
      auth.supabase,
      tenantId,
      auth.user.id,
      membership.role,
    );

    const dto = await composeMobileGlobalSearch({
      userClient: auth.supabase,
      tenantId,
      tenantSlug: tenant.slug,
      permissions: resolved.permissions,
      q,
      types,
      limit,
      cursor,
    });

    return mobileJson(dto);
  } catch (err) {
    return mobileError(mapDatabaseErrorToUserMessage(err));
  }
}
