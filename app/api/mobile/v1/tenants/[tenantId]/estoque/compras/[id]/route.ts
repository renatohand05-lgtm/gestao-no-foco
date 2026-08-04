import {
  authorizeStockRoute,
  stockForbiddenOrError,
} from "@/lib/mobile/stock-route-auth";
import { composeStockPurchaseDetail } from "@/lib/mobile/stock-compose";
import { mobileJson, mobileNotFound } from "@/lib/mobile/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ tenantId: string; id: string }> };

/** GET /api/mobile/v1/tenants/:tenantId/estoque/compras/:id */
export async function GET(request: Request, context: RouteContext) {
  const { tenantId, id } = await context.params;
  const auth = await authorizeStockRoute(request, tenantId);
  if (!auth.ok) return auth.response;

  try {
    const dto = await composeStockPurchaseDetail({
      client: auth.ctx.supabase,
      tenantId: auth.ctx.tenantId,
      permissions: auth.ctx.permissions,
      id,
    });
    return mobileJson(dto);
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return mobileNotFound("Pedido não encontrado");
    }
    return stockForbiddenOrError(err);
  }
}
