import {
  authorizeFinanceRoute,
  financeForbiddenOrError,
} from "@/lib/mobile/finance-route-auth";
import { composeDreMobile } from "@/lib/mobile/finance-compose";
import { mobileJson } from "@/lib/mobile/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ tenantId: string }> };

/** GET /api/mobile/v1/tenants/:tenantId/financeiro/dre */
export async function GET(request: Request, context: RouteContext) {
  const { tenantId } = await context.params;
  const auth = await authorizeFinanceRoute(request, tenantId);
  if (!auth.ok) return auth.response;

  try {
    const dto = await composeDreMobile({
      client: auth.ctx.supabase,
      tenantId: auth.ctx.tenantId,
      permissions: auth.ctx.permissions,
    });
    return mobileJson(dto);
  } catch (err) {
    return financeForbiddenOrError(err);
  }
}
