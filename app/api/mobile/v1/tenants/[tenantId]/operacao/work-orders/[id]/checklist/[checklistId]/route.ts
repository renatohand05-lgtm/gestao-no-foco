import { updateFieldChecklistItem } from "@/lib/mobile/field-compose";
import {
  authorizeOpsRoute,
  opsForbiddenOrError,
} from "@/lib/mobile/operations-route-auth";
import { mobileJson } from "@/lib/mobile/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ tenantId: string; id: string; checklistId: string }>;
};

/** PATCH /api/mobile/v1/tenants/:tenantId/operacao/work-orders/:id/checklist/:checklistId */
export async function PATCH(request: Request, context: RouteContext) {
  const { tenantId, id, checklistId } = await context.params;
  const auth = await authorizeOpsRoute(request, tenantId);
  if (!auth.ok) return auth.response;
  try {
    const body = (await request.json()) as {
      classificacao?: string;
      observacao?: string | null;
    };
    const result = await updateFieldChecklistItem({
      client: auth.ctx.supabase,
      tenantId: auth.ctx.tenantId,
      permissions: auth.ctx.permissions,
      osId: id,
      checklistId,
      classificacao: body.classificacao ?? "nao_verificado",
      observacao: body.observacao ?? null,
      userId: auth.ctx.user.id,
    });
    return mobileJson(result);
  } catch (err) {
    return opsForbiddenOrError(err);
  }
}
