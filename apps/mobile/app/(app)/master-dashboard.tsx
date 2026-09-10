import {
  authenticateMobileRequest,
  isMobileAuthFailure,
} from "@/lib/mobile/auth-request";
import { composeMasterDashboard } from "@/lib/mobile/master-compose";
import {
  mobileError,
  mobileForbidden,
  mobileJson,
  mobileUnauthorized,
} from "@/lib/mobile/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/mobile/v1/master/dashboard */
export async function GET(request: Request) {
  const auth = await authenticateMobileRequest(request);
  if (isMobileAuthFailure(auth)) {
    return mobileUnauthorized(auth.message);
  }

  try {
    const dashboard = await composeMasterDashboard(auth.supabase, auth.user.id);
    if (!dashboard) {
      return mobileForbidden("Acesso restrito ao dono/parceiro da plataforma");
    }
    return mobileJson(dashboard);
  } catch (err) {
    return mobileError(err instanceof Error ? err.message : "Erro inesperado");
  }
}
