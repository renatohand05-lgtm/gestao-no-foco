"use server";

import { buildAiAssistantDataContext } from "@/lib/ai-assistant/ai-assistant-context";
import {
  AiAssistantNotConfiguredError,
  callAiAssistant,
  type AiAssistantChatMessage,
} from "@/lib/ai-assistant/ai-assistant-service";
import { isPlanFeatureUnlocked } from "@/lib/billing/feature-entitlement";
import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/lib/tenants";

export type AiAssistantMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

type ActionResult<T> =
  | { success: true; data: T }
  | {
      success: false;
      error: string;
      notConfigured?: boolean;
      planLocked?: boolean;
    };

async function getOrCreateConversationId(
  client: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  userId: string,
): Promise<string> {
  const { data: existing } = await client
    .from("ai_assistant_conversations" as never)
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .maybeSingle<{ id: string }>();

  if (existing) return existing.id;

  const { data: created, error } = await client
    .from("ai_assistant_conversations" as never)
    .insert({ tenant_id: tenantId, user_id: userId } as never)
    .select("id")
    .single<{ id: string }>();

  if (error || !created) {
    throw new Error(error?.message ?? "Não foi possível iniciar a conversa.");
  }
  return created.id;
}

export async function fetchAiAssistantConversation(
  tenantSlug: string,
): Promise<ActionResult<AiAssistantMessage[]>> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const client = await createClient();
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) throw new Error("Não autenticado.");

    const unlocked = await isPlanFeatureUnlocked(
      client,
      tenant.id,
      "inteligencia_ia",
    );
    if (!unlocked) {
      return {
        success: false,
        error: "O assistente de IA é um recurso do plano Essencial em diante.",
        planLocked: true,
      };
    }

    const conversationId = await getOrCreateConversationId(
      client,
      tenant.id,
      user.id,
    );

    const { data: messages } = await client
      .from("ai_assistant_messages" as never)
      .select("id, role, content, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(100);

    const mapped = ((messages ?? []) as unknown as Array<{
      id: string;
      role: "user" | "assistant";
      content: string;
      created_at: string;
    }>).map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: m.created_at,
    }));

    return { success: true, data: mapped };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro ao carregar a conversa.",
    };
  }
}

export async function sendAiAssistantMessage(
  tenantSlug: string,
  body: string,
): Promise<ActionResult<AiAssistantMessage>> {
  try {
    if (!body.trim()) throw new Error("Escreva uma mensagem antes de enviar.");

    const tenant = await requireTenant(tenantSlug);
    const client = await createClient();
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) throw new Error("Não autenticado.");

    const unlocked = await isPlanFeatureUnlocked(
      client,
      tenant.id,
      "inteligencia_ia",
    );
    if (!unlocked) {
      return {
        success: false,
        error: "O assistente de IA é um recurso do plano Essencial em diante.",
        planLocked: true,
      };
    }

    const conversationId = await getOrCreateConversationId(
      client,
      tenant.id,
      user.id,
    );

    const { error: userInsertError } = await client
      .from("ai_assistant_messages" as never)
      .insert({
        conversation_id: conversationId,
        role: "user",
        content: body.trim(),
      } as never);
    if (userInsertError) throw new Error(userInsertError.message);

    const { data: historyRows } = await client
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

    const dataContext = await buildAiAssistantDataContext(tenant);
    const replyText = await callAiAssistant(history, dataContext);

    const { data: assistantRow, error: assistantInsertError } = await client
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

    return {
      success: true,
      data: {
        id: assistantRow.id,
        role: "assistant",
        content: replyText,
        createdAt: assistantRow.created_at,
      },
    };
  } catch (error) {
    if (error instanceof AiAssistantNotConfiguredError) {
      return { success: false, error: error.message, notConfigured: true };
    }
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Erro ao enviar mensagem.",
    };
  }
}
