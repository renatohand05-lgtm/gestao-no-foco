import { composeMobileOperationalDashboardOnly } from "@/lib/mobile/intelligence-compose";
import {
  authorizeIntelligenceRoute,
  intelligenceForbiddenOrError,
} from "@/lib/mobile/intelligence-route-auth";
import { mobileJson } from "@/lib/mobile/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ tenantId: string }> };

/** GET /api/mobile/v1/tenants/:tenantId/inteligencia/operacional */
export async function GET(request: Request, context: RouteContext) {
  const { tenantId } = await context.params;
  const auth = await authorizeIntelligenceRoute(request, tenantId);
  if (!auth.ok) return auth.response;

  try {
    const dto = await composeMobileOperationalDashboardOnly({
      userClient: auth.ctx.supabase,
      tenantId: auth.ctx.tenantId,
      tenantSlug: auth.ctx.tenantSlug,
      tenantName: auth.ctx.tenantName,
      segment: auth.ctx.segment,
      displayName: auth.ctx.displayName,
      branchId: auth.ctx.branchId,
      branchName: auth.ctx.branchName,
      permissions: auth.ctx.permissions,
    });
    return mobileJson(dto);
  } catch (err) {
    return intelligenceForbiddenOrError(err);
  }
}
