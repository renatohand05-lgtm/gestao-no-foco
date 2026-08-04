import { composeMobileIntelligencePack } from "@/lib/mobile/intelligence-compose";
import {
  authorizeIntelligenceRoute,
  intelligenceForbiddenOrError,
} from "@/lib/mobile/intelligence-route-auth";
import { mobileJson } from "@/lib/mobile/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ tenantId: string }> };

async function pack(request: Request, tenantId: string) {
  const auth = await authorizeIntelligenceRoute(request, tenantId);
  if (!auth.ok) return { ok: false as const, response: auth.response };
  const dto = await composeMobileIntelligencePack({
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
  return { ok: true as const, dto };
}

/** GET /api/mobile/v1/tenants/:tenantId/inteligencia/alertas */
export async function GET(request: Request, context: RouteContext) {
  const { tenantId } = await context.params;
  try {
    const result = await pack(request, tenantId);
    if (!result.ok) return result.response;
    return mobileJson(result.dto.alertCenter);
  } catch (err) {
    return intelligenceForbiddenOrError(err);
  }
}
