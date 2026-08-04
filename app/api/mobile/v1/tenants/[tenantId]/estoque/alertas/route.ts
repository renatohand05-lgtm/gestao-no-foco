import {
  authorizeStockRoute,
  stockForbiddenOrError,
} from "@/lib/mobile/stock-route-auth";
import { composeStockAlerts } from "@/lib/mobile/stock-compose";
import { mobileJson } from "@/lib/mobile/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ tenantId: string }> };

/** GET /api/mobile/v1/tenants/:tenantId/estoque/alertas */
export async function GET(request: Request, context: RouteContext) {
  const { tenantId } = await context.params;
  const auth = await authorizeStockRoute(request, tenantId);
  if (!auth.ok) return auth.response;

  try {
    const dto = await composeStockAlerts({
      client: auth.ctx.supabase,
      tenantId: auth.ctx.tenantId,
      tenantSlug: auth.ctx.tenantSlug,
      permissions: auth.ctx.permissions,
    });
    return mobileJson(dto);
  } catch (err) {
    return stockForbiddenOrError(err);
  }
}
