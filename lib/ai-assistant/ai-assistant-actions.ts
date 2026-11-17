"use server";

import { buildAiAssistantRequestContext } from "@/lib/ai-assistant/ai-assistant-context";
import {
  getOrCreateConversationId,
  insertMessage,
  loadHistory,
} from "@/lib/ai-assistant/ai-assistant-conversation";
import { MAX_USER_MESSAGE_CHARS } from "@/lib/ai-assistant/ai-assistant-request";
import {
  AiAssistantNotConfiguredError,
  callAiAssistant,
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

const PLAN_LOCKED_MESSAGE =
  "O assistente de IA é um recurso do plano Essencial em diante.";

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
      return { success: false, error: PLAN_LOCKED_MESSAGE, planLocked: true };
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
      .order("created_at", { ascending: false })
      .limit(100);

    const mapped = ((messages ?? []) as unknown as Array<{
      id: string;
      role: "user" | "assistant";
      content: string;
      created_at: string;
    }>)
      .reverse()
      .map((m) => ({
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

/** Resposta completa de uma vez (sem streaming). A tela usa a rota de streaming; isto fica como alternativa. */
export async function sendAiAssistantMessage(
  tenantSlug: string,
  body: string,
): Promise<ActionResult<AiAssistantMessage>> {
  try {
    const text = body.trim();
    if (!text) throw new Error("Escreva uma mensagem antes de enviar.");
    if (text.length > MAX_USER_MESSAGE_CHARS) {
      throw new Error(
        `A mensagem é longa demais (máximo ${MAX_USER_MESSAGE_CHARS} caracteres).`,
      );
    }

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
      return { success: false, error: PLAN_LOCKED_MESSAGE, planLocked: true };
    }

    const conversationId = await getOrCreateConversationId(
      client,
      tenant.id,
      user.id,
    );
    await insertMessage(client, conversationId, "user", text);

    const [history, context] = await Promise.all([
      loadHistory(client, conversationId),
      buildAiAssistantRequestContext(tenant, client),
    ]);
    const replyText = await callAiAssistant(history, context);

    const saved = await insertMessage(client, conversationId, "assistant", replyText);

    return {
      success: true,
      data: {
        id: saved.id,
        role: "assistant",
        content: replyText,
        createdAt: saved.createdAt,
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

/** "Nova conversa": apaga as mensagens da conversa da pessoa nesta empresa. */
export async function clearAiAssistantConversation(
  tenantSlug: string,
): Promise<ActionResult<null>> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const client = await createClient();
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) throw new Error("Não autenticado.");

    const conversationId = await getOrCreateConversationId(
      client,
      tenant.id,
      user.id,
    );
    const { error } = await client
      .from("ai_assistant_messages" as never)
      .delete()
      .eq("conversation_id", conversationId);
    if (error) throw new Error(error.message);

    return { success: true, data: null };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Não foi possível iniciar uma nova conversa.",
    };
  }
}
