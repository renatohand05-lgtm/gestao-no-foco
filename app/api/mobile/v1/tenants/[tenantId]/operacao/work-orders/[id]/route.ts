import {
  authorizeOpsRoute,
  opsForbiddenOrError,
} from "@/lib/mobile/operations-route-auth";
import { composeOpsWorkOrderDetail } from "@/lib/mobile/operations-compose";
import { mobileJson, mobileNotFound } from "@/lib/mobile/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ tenantId: string; id: string }> };

/** GET /api/mobile/v1/tenants/:tenantId/operacao/work-orders/:id */
export async function GET(request: Request, context: RouteContext) {
  const { tenantId, id } = await context.params;
  const auth = await authorizeOpsRoute(request, tenantId);
  if (!auth.ok) return auth.response;

  try {
    const dto = await composeOpsWorkOrderDetail({
      client: auth.ctx.supabase,
      tenantId: auth.ctx.tenantId,
      tenantSlug: auth.ctx.tenantSlug,
      permissions: auth.ctx.permissions,
      id,
    });
    return mobileJson(dto);
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return mobileNotFound("Ordem não encontrada");
    }
    return opsForbiddenOrError(err);
  }
}
