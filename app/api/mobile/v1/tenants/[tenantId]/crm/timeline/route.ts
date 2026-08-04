import {
  authorizeCrmRoute,
  crmForbiddenOrError,
} from "@/lib/mobile/crm-route-auth";
import { composeCrmTimeline } from "@/lib/mobile/crm-compose";
import { mobileJson } from "@/lib/mobile/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ tenantId: string }> };

/** GET /api/mobile/v1/tenants/:tenantId/crm/timeline */
export async function GET(request: Request, context: RouteContext) {
  const { tenantId } = await context.params;
  const auth = await authorizeCrmRoute(request, tenantId);
  if (!auth.ok) return auth.response;
  const clienteId = new URL(request.url).searchParams.get("clienteId");

  try {
    const dto = await composeCrmTimeline({
      client: auth.ctx.supabase,
      tenantId: auth.ctx.tenantId,
      permissions: auth.ctx.permissions,
      clienteId,
    });
    return mobileJson(dto);
  } catch (err) {
    return crmForbiddenOrError(err);
  }
}
