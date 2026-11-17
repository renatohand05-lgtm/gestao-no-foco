import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

import type { AiAssistantChatMessage } from "./ai-assistant-request";

type Client = SupabaseClient<Database>;

/** Cada pessoa tem uma conversa por empresa; cria na primeira vez. */
export async function getOrCreateConversationId(
  client: Client,
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

export async function insertMessage(
  client: Client,
  conversationId: string,
  role: "user" | "assistant",
  content: string,
): Promise<{ id: string; createdAt: string }> {
  const { data, error } = await client
    .from("ai_assistant_messages" as never)
    .insert({ conversation_id: conversationId, role, content } as never)
    .select("id, created_at")
    .single<{ id: string; created_at: string }>();
  if (error || !data) {
    throw new Error(error?.message ?? "Falha ao salvar a mensagem.");
  }
  return { id: data.id, createdAt: data.created_at };
}

/** Últimas mensagens da conversa, da mais antiga para a mais nova. */
export async function loadHistory(
  client: Client,
  conversationId: string,
  limit = 30,
): Promise<AiAssistantChatMessage[]> {
  const { data } = await client
    .from("ai_assistant_messages" as never)
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return ((data ?? []) as unknown as AiAssistantChatMessage[]).reverse();
}
