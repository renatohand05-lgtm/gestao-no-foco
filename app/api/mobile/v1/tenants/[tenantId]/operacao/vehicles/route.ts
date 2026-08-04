import {
  authorizeOpsRoute,
  opsForbiddenOrError,
} from "@/lib/mobile/operations-route-auth";
import { composeOpsVehicles } from "@/lib/mobile/operations-compose";
import { mobileJson } from "@/lib/mobile/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ tenantId: string }> };

/** GET /api/mobile/v1/tenants/:tenantId/operacao/vehicles */
export async function GET(request: Request, context: RouteContext) {
  const { tenantId } = await context.params;
  const auth = await authorizeOpsRoute(request, tenantId);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? undefined;
  const page = Number(url.searchParams.get("page") ?? "1") || 1;

  try {
    const dto = await composeOpsVehicles({
      client: auth.ctx.supabase,
      tenantId: auth.ctx.tenantId,
      permissions: auth.ctx.permissions,
      q,
      page,
    });
    return mobileJson(dto);
  } catch (err) {
    return opsForbiddenOrError(err);
  }
}
