import {
  authenticateMobileRequest,
  isMobileAuthFailure,
} from "@/lib/mobile/auth-request";
import {
  mobileError,
  mobileForbidden,
  mobileJson,
  mobileUnauthorized,
} from "@/lib/mobile/response";
import { isPlatformOwnerClient } from "@/lib/mobile/master-auth";
import { listTicketsForOwner } from "@/lib/support/support-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/mobile/v1/master/suporte/tickets */
export async function GET(request: Request) {
  const auth = await authenticateMobileRequest(request);
  if (isMobileAuthFailure(auth)) {
    return mobileUnauthorized(auth.message);
  }

  try {
    const isOwner = await isPlatformOwnerClient(auth.supabase, auth.user.id);
    if (!isOwner) {
      return mobileForbidden("Central de suporte é exclusiva do dono da plataforma");
    }

    const tickets = await listTicketsForOwner(auth.supabase);
    return mobileJson({ tickets });
  } catch (err) {
    return mobileError(err instanceof Error ? err.message : "Erro inesperado");
  }
}
