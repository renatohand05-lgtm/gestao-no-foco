import {
  deleteFieldAnexo,
  getFieldAnexoSignedUrl,
} from "@/lib/mobile/field-compose";
import {
  authorizeOpsRoute,
  opsForbiddenOrError,
} from "@/lib/mobile/operations-route-auth";
import { mobileJson } from "@/lib/mobile/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ tenantId: string; id: string; anexoId: string }>;
};

/** GET URL assinada temporária (não pública permanente) */
export async function GET(request: Request, context: RouteContext) {
  const { tenantId, anexoId } = await context.params;
  const auth = await authorizeOpsRoute(request, tenantId);
  if (!auth.ok) return auth.response;
  try {
    const result = await getFieldAnexoSignedUrl({
      client: auth.ctx.supabase,
      tenantId: auth.ctx.tenantId,
      permissions: auth.ctx.permissions,
      anexoId,
    });
    return mobileJson(result);
  } catch (err) {
    return opsForbiddenOrError(err);
  }
}

/** DELETE soft-delete anexo */
export async function DELETE(request: Request, context: RouteContext) {
  const { tenantId, anexoId } = await context.params;
  const auth = await authorizeOpsRoute(request, tenantId);
  if (!auth.ok) return auth.response;
  try {
    const result = await deleteFieldAnexo({
      client: auth.ctx.supabase,
      tenantId: auth.ctx.tenantId,
      permissions: auth.ctx.permissions,
      anexoId,
    });
    return mobileJson(result);
  } catch (err) {
    return opsForbiddenOrError(err);
  }
}
