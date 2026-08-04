import {
  authorizeOpsRoute,
  opsForbiddenOrError,
} from "@/lib/mobile/operations-route-auth";
import { composeOpsTeam } from "@/lib/mobile/operations-compose";
import { mobileJson } from "@/lib/mobile/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ tenantId: string }> };

/** GET /api/mobile/v1/tenants/:tenantId/operacao/team */
export async function GET(request: Request, context: RouteContext) {
  const { tenantId } = await context.params;
  const auth = await authorizeOpsRoute(request, tenantId);
  if (!auth.ok) return auth.response;

  try {
    const dto = await composeOpsTeam({
      client: auth.ctx.supabase,
      tenantId: auth.ctx.tenantId,
      permissions: auth.ctx.permissions,
    });
    return mobileJson(dto);
  } catch (err) {
    return opsForbiddenOrError(err);
  }
}
