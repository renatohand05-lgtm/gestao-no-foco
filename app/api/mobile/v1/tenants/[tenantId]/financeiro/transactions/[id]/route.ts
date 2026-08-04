import {
  authorizeFinanceRoute,
  financeForbiddenOrError,
} from "@/lib/mobile/finance-route-auth";
import { composeFinanceDetail } from "@/lib/mobile/finance-compose";
import { mobileJson, mobileNotFound } from "@/lib/mobile/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ tenantId: string; id: string }> };

/** GET /api/mobile/v1/tenants/:tenantId/financeiro/transactions/:id?kind=pagar|receber */
export async function GET(request: Request, context: RouteContext) {
  const { tenantId, id } = await context.params;
  const auth = await authorizeFinanceRoute(request, tenantId);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const kindParam = url.searchParams.get("kind");
  const kind = kindParam === "receber" ? "receber" : "pagar";

  try {
    const dto = await composeFinanceDetail({
      client: auth.ctx.supabase,
      tenantId: auth.ctx.tenantId,
      permissions: auth.ctx.permissions,
      kind,
      id,
    });
    if (!dto) return mobileNotFound("Lançamento não encontrado");
    return mobileJson(dto);
  } catch (err) {
    return financeForbiddenOrError(err);
  }
}
