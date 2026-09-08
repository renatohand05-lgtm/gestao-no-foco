import {
  authenticateMobileRequest,
  isMobileAuthFailure,
} from "@/lib/mobile/auth-request";
import { getActiveMembership } from "@/lib/mobile/membership";
import {
  mobileError,
  mobileForbidden,
  mobileJson,
  mobileUnauthorized,
} from "@/lib/mobile/response";
import {
  getTenantConversation,
  markTenantRead,
  sendTenantMessage,
} from "@/lib/support/support-service";
import { mapDatabaseErrorToUserMessage } from "@/lib/supabase/friendly-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ tenantId: string }> };

/** GET /api/mobile/v1/tenants/:tenantId/support/conversation */
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

    const conversation = await getTenantConversation(auth.supabase, tenantId);
    if (conversation.ticketId) {
      await markTenantRead(auth.supabase, conversation.ticketId);
    }

    return mobileJson(conversation);
  } catch (err) {
    return mobileError(mapDatabaseErrorToUserMessage(err));
  }
}

/** POST /api/mobile/v1/tenants/:tenantId/support/conversation { body: string } */
export async function POST(request: Request, context: RouteContext) {
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

    const payload = (await request.json().catch(() => null)) as
      | { body?: string }
      | null;
    const body = payload?.body?.trim();
    if (!body) {
      return mobileError("Escreva uma mensagem antes de enviar.", 400);
    }

    await sendTenantMessage(auth.supabase, tenantId, auth.user.id, body);
    const conversation = await getTenantConversation(auth.supabase, tenantId);

    return mobileJson(conversation, 201);
  } catch (err) {
    return mobileError(mapDatabaseErrorToUserMessage(err));
  }
}
