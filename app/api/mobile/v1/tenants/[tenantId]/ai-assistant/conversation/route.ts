import type { SupabaseClient } from "@supabase/supabase-js";

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
import { isPlanFeatureUnlocked } from "@/lib/billing/feature-entitlement";
import { buildAiAssistantDataContext } from "@/lib/ai-assistant/ai-assistant-context";
import {
  AiAssistantNotConfiguredError,
  callAiAssistant,
  type AiAssistantChatMessage,
} from "@/lib/ai-assistant/ai-assistant-service";
import type { TenantSegment } from "@/types";
import { mapDatabaseErrorToUserMessage } from "@/lib/supabase/friendly-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ tenantId: string }> };

async function getOrCreateConversationId(
  supabase: SupabaseClient,
  tenantId: string,
  userId: string,
): Promise<string> {
  const { data: existing } = await supabase
    .from("ai_assistant_conversations" as never)
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .maybeSingle<{ id: string }>();

  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from("ai_assistant_conversations" as never)
    .insert({ tenant_id: tenantId, user_id: userId } as never)
    .select("id")
    .single<{ id: string }>();

  if (error || !created) {
    throw new Error(error?.message ?? "Não foi possível iniciar a conversa.");
  }
  return created.id;
}

/** GET /api/mobile/v1/tenants/:tenantId/ai-assistant/conversation */
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

    const unlocked = await isPlanFeatureUnlocked(
      auth.supabase,
      tenantId,
      "inteligencia_ia",
    );
    if (!unlocked) {
      return mobileForbidden(
        "O assistente de IA é um recurso do plano Essencial em diante.",
      );
    }

    const conversationId = await getOrCreateConversationId(
      auth.supabase,
      tenantId,
      auth.user.id,
    );

    const { data: messages } = await auth.supabase
      .from("ai_assistant_messages" as never)
      .select("id, role, content, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(100);

    return mobileJson({ messages: messages ?? [] });
  } catch (err) {
    return mobileError(mapDatabaseErrorToUserMessage(err));
  }
}

/** POST /api/mobile/v1/tenants/:tenantId/ai-assistant/conversation { body: string } */
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

    const unlocked = await isPlanFeatureUnlocked(
      auth.supabase,
      tenantId,
      "inteligencia_ia",
    );
    if (!unlocked) {
      return mobileForbidden(
        "O assistente de IA é um recurso do plano Essencial em diante.",
      );
    }

    const payload = (await request.json().catch(() => null)) as
      | { body?: string }
      | null;
    const body = payload?.body?.trim();
    if (!body) {
      return mobileError("Escreva uma mensagem antes de enviar.", 400);
    }

    const conversationId = await getOrCreateConversationId(
      auth.supabase,
      tenantId,
      auth.user.id,
    );

    const { error: userInsertError } = await auth.supabase
      .from("ai_assistant_messages" as never)
      .insert({
        conversation_id: conversationId,
        role: "user",
        content: body,
      } as never);
    if (userInsertError) throw new Error(userInsertError.message);

    const { data: historyRows } = await auth.supabase
      .from("ai_assistant_messages" as never)
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(30);

    const history: AiAssistantChatMessage[] = (
      (historyRows ?? []) as unknown as Array<{
        role: "user" | "assistant";
        content: string;
      }>
    ).map((m) => ({ role: m.role, content: m.content }));

    const { data: tenant } = await auth.supabase
      .from("tenants")
      .select("id, slug, name, segment")
      .eq("id", tenantId)
      .maybeSingle();

    const dataContext = tenant
      ? await buildAiAssistantDataContext({
          ...tenant,
          segment: tenant.segment as TenantSegment | null,
        })
      : "Dados da empresa indisponíveis no momento.";

    let replyText: string;
    try {
      replyText = await callAiAssistant(history, dataContext);
    } catch (err) {
      if (err instanceof AiAssistantNotConfiguredError) {
        return mobileForbidden(err.message);
      }
      throw err;
    }

    const { data: assistantRow, error: assistantInsertError } =
      await auth.supabase
        .from("ai_assistant_messages" as never)
        .insert({
          conversation_id: conversationId,
          role: "assistant",
          content: replyText,
        } as never)
        .select("id, created_at")
        .single<{ id: string; created_at: string }>();
    if (assistantInsertError || !assistantRow) {
      throw new Error(
        assistantInsertError?.message ?? "Falha ao salvar a resposta.",
      );
    }

    return mobileJson(
      {
        id: assistantRow.id,
        role: "assistant" as const,
        content: replyText,
        createdAt: assistantRow.created_at,
      },
      201,
    );
  } catch (err) {
    return mobileError(mapDatabaseErrorToUserMessage(err));
  }
}
