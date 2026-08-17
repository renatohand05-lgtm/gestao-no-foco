import {
  authorizeOpsRoute,
  opsForbiddenOrError,
} from "@/lib/mobile/operations-route-auth";
import { composeOpsCustomerDetail } from "@/lib/mobile/operations-compose";
import { mobileJson, mobileNotFound } from "@/lib/mobile/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ tenantId: string; id: string }> };

/** GET /api/mobile/v1/tenants/:tenantId/operacao/customers/:id */
export async function GET(request: Request, context: RouteContext) {
  const { tenantId, id } = await context.params;
  const auth = await authorizeOpsRoute(request, tenantId);
  if (!auth.ok) return auth.response;

  try {
    const dto = await composeOpsCustomerDetail({
      client: auth.ctx.supabase,
      tenantId: auth.ctx.tenantId,
      permissions: auth.ctx.permissions,
      id,
      segment: auth.ctx.segment,
      segmentVersion: auth.ctx.segmentVersion,
      segmentConfig: auth.ctx.segmentConfig,
    });
    return mobileJson(dto);
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return mobileNotFound("Cliente não encontrado");
    }
    return opsForbiddenOrError(err);
  }
}
