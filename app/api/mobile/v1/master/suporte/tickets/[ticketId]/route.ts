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
import {
  closeTicket,
  getTicketThread,
  markOwnerRead,
  sendOwnerMessage,
} from "@/lib/support/support-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ ticketId: string }> };

/** GET /api/mobile/v1/master/suporte/tickets/:ticketId — marca como lido e retorna a thread */
export async function GET(request: Request, context: RouteContext) {
  const auth = await authenticateMobileRequest(request);
  if (isMobileAuthFailure(auth)) {
    return mobileUnauthorized(auth.message);
  }
  const { ticketId } = await context.params;

  try {
    const isOwner = await isPlatformOwnerClient(auth.supabase, auth.user.id);
    if (!isOwner) {
      return mobileForbidden("Central de suporte é exclusiva do dono da plataforma");
    }

    const messages = await getTicketThread(auth.supabase, ticketId);
    await markOwnerRead(auth.supabase, ticketId);
    return mobileJson({ messages });
  } catch (err) {
    return mobileError(err instanceof Error ? err.message : "Erro inesperado");
  }
}

/** POST /api/mobile/v1/master/suporte/tickets/:ticketId { body: string } — responder */
export async function POST(request: Request, context: RouteContext) {
  const auth = await authenticateMobileRequest(request);
  if (isMobileAuthFailure(auth)) {
    return mobileUnauthorized(auth.message);
  }
  const { ticketId } = await context.params;

  try {
    const isOwner = await isPlatformOwnerClient(auth.supabase, auth.user.id);
    if (!isOwner) {
      return mobileForbidden("Central de suporte é exclusiva do dono da plataforma");
    }

    const payload = (await request.json().catch(() => null)) as
      | { body?: string }
      | null;
    const body = payload?.body?.trim();
    if (!body) {
      return mobileError("Escreva uma mensagem antes de enviar.", 400);
    }

    await sendOwnerMessage(auth.supabase, ticketId, auth.user.id, body);
    const messages = await getTicketThread(auth.supabase, ticketId);
    return mobileJson({ messages }, 201);
  } catch (err) {
    return mobileError(err instanceof Error ? err.message : "Erro inesperado");
  }
}

/** PATCH /api/mobile/v1/master/suporte/tickets/:ticketId { action: "close" } */
export async function PATCH(request: Request, context: RouteContext) {
  const auth = await authenticateMobileRequest(request);
  if (isMobileAuthFailure(auth)) {
    return mobileUnauthorized(auth.message);
  }
  const { ticketId } = await context.params;

  try {
    const isOwner = await isPlatformOwnerClient(auth.supabase, auth.user.id);
    if (!isOwner) {
      return mobileForbidden("Central de suporte é exclusiva do dono da plataforma");
    }

    const payload = (await request.json().catch(() => null)) as
      | { action?: string }
      | null;
    if (payload?.action !== "close") {
      return mobileError("Ação inválida.", 400);
    }

    await closeTicket(auth.supabase, ticketId);
    return mobileJson({ ok: true });
  } catch (err) {
    return mobileError(err instanceof Error ? err.message : "Erro inesperado");
  }
}
