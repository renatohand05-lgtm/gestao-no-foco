import {
  authenticateMobileRequest,
  isMobileAuthFailure,
} from "@/lib/mobile/auth-request";
import { getActiveMembership } from "@/lib/mobile/membership";
import {
  mobileForbidden,
  mobileJson,
  mobileUnauthorized,
} from "@/lib/mobile/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ tenantId: string }> };

/** GET /api/mobile/v1/tenants/:tenantId/branches */
export async function GET(request: Request, context: RouteContext) {
  const auth = await authenticateMobileRequest(request);
  if (isMobileAuthFailure(auth)) {
    return mobileUnauthorized(auth.message);
  }

  const { tenantId } = await context.params;
  const membership = await getActiveMembership(auth.supabase, tenantId, auth.user.id);
  if (!membership) {
    return mobileForbidden("Você não pertence a esta empresa");
  }

  return mobileJson({
    items: [],
    allowContinueWithoutBranch: true,
    message: "Nenhuma filial cadastrada — continue no escopo da empresa.",
  });
}
