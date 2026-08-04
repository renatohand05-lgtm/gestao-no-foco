import {
  authorizeCrmRoute,
  crmForbiddenOrError,
} from "@/lib/mobile/crm-route-auth";
import { composeCrmClientDetail } from "@/lib/mobile/crm-compose";
import { mobileJson } from "@/lib/mobile/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ tenantId: string; id: string }> };

/** GET /api/mobile/v1/tenants/:tenantId/crm/clients/:id */
export async function GET(request: Request, context: RouteContext) {
  const { tenantId, id } = await context.params;
  const auth = await authorizeCrmRoute(request, tenantId);
  if (!auth.ok) return auth.response;

  try {
    const dto = await composeCrmClientDetail({
      client: auth.ctx.supabase,
      tenantId: auth.ctx.tenantId,
      permissions: auth.ctx.permissions,
      clienteId: id,
    });
    return mobileJson(dto);
  } catch (err) {
    return crmForbiddenOrError(err);
  }
}
