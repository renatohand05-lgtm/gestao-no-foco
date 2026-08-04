import {
  authorizeStockRoute,
  stockForbiddenOrError,
} from "@/lib/mobile/stock-route-auth";
import { composeStockPurchases } from "@/lib/mobile/stock-compose";
import { mobileJson } from "@/lib/mobile/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ tenantId: string }> };

/** GET /api/mobile/v1/tenants/:tenantId/estoque/compras */
export async function GET(request: Request, context: RouteContext) {
  const { tenantId } = await context.params;
  const auth = await authorizeStockRoute(request, tenantId);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? undefined;

  try {
    const dto = await composeStockPurchases({
      client: auth.ctx.supabase,
      tenantId: auth.ctx.tenantId,
      permissions: auth.ctx.permissions,
      status,
    });
    return mobileJson(dto);
  } catch (err) {
    return stockForbiddenOrError(err);
  }
}
