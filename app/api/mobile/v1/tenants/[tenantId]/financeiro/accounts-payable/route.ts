import {
  authorizeFinanceRoute,
  financeForbiddenOrError,
} from "@/lib/mobile/finance-route-auth";
import { composeAccountsPayable } from "@/lib/mobile/finance-compose";
import { mobileJson } from "@/lib/mobile/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ tenantId: string }> };

/** GET /api/mobile/v1/tenants/:tenantId/financeiro/accounts-payable */
export async function GET(request: Request, context: RouteContext) {
  const { tenantId } = await context.params;
  const auth = await authorizeFinanceRoute(request, tenantId);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") ?? "1");
  const status = url.searchParams.get("status") ?? undefined;

  try {
    const dto = await composeAccountsPayable({
      client: auth.ctx.supabase,
      tenantId: auth.ctx.tenantId,
      permissions: auth.ctx.permissions,
      page: Number.isFinite(page) ? Math.min(Math.max(1, page), 100) : 1,
      status: status ?? undefined,
    });
    return mobileJson(dto);
  } catch (err) {
    return financeForbiddenOrError(err);
  }
}
