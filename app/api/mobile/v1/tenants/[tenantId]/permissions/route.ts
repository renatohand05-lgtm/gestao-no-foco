import {
  authenticateMobileRequest,
  isMobileAuthFailure,
} from "@/lib/mobile/auth-request";
import { getActiveMembership } from "@/lib/mobile/membership";
import { resolveMobilePermissions } from "@/lib/mobile/permissions";
import {
  mobileError,
  mobileForbidden,
  mobileJson,
  mobileUnauthorized,
} from "@/lib/mobile/response";
import { mapDatabaseErrorToUserMessage } from "@/lib/supabase/friendly-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ tenantId: string }> };

/** GET /api/mobile/v1/tenants/:tenantId/permissions */
export async function GET(request: Request, context: RouteContext) {
  const auth = await authenticateMobileRequest(request);
  if (isMobileAuthFailure(auth)) {
    return mobileUnauthorized(auth.message);
  }

  const { tenantId } = await context.params;

  try {
    const membership = await getActiveMembership(
      auth.supabase,
      tenantId,
      auth.user.id,
    );
    if (!membership) {
      return mobileForbidden("Você não pertence a esta empresa");
    }

    const resolved = await resolveMobilePermissions(
      auth.supabase,
      tenantId,
      auth.user.id,
      membership.role,
    );

    return mobileJson(resolved);
  } catch (err) {
    return mobileError(mapDatabaseErrorToUserMessage(err));
  }
}
