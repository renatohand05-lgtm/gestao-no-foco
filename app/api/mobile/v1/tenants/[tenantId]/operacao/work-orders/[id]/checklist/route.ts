import { listFieldChecklist } from "@/lib/mobile/field-compose";
import {
  authorizeOpsRoute,
  opsForbiddenOrError,
} from "@/lib/mobile/operations-route-auth";
import { mobileJson } from "@/lib/mobile/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ tenantId: string; id: string }> };

/** GET /api/mobile/v1/tenants/:tenantId/operacao/work-orders/:id/checklist */
export async function GET(request: Request, context: RouteContext) {
  const { tenantId, id } = await context.params;
  const auth = await authorizeOpsRoute(request, tenantId);
  if (!auth.ok) return auth.response;
  try {
    const items = await listFieldChecklist({
      client: auth.ctx.supabase,
      tenantId: auth.ctx.tenantId,
      permissions: auth.ctx.permissions,
      osId: id,
    });
    return mobileJson({ items });
  } catch (err) {
    return opsForbiddenOrError(err);
  }
}
