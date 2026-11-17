import { buildAiAssistantRequestContext } from "@/lib/ai-assistant/ai-assistant-context";
import {
  getOrCreateConversationId,
  insertMessage,
  loadHistory,
} from "@/lib/ai-assistant/ai-assistant-conversation";
import { ERROR_MARKER } from "@/lib/ai-assistant/ai-assistant-format";
import { MAX_USER_MESSAGE_CHARS } from "@/lib/ai-assistant/ai-assistant-request";
import {
  AiAssistantNotConfiguredError,
  isAiAssistantConfigured,
  streamAiAssistant,
} from "@/lib/ai-assistant/ai-assistant-service";
import { isPlanFeatureUnlocked } from "@/lib/billing/feature-entitlement";
import { createClient } from "@/lib/supabase/server";
import { getUserTenants } from "@/lib/tenants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** A IA pode levar algumas dezenas de segundos para escrever um plano completo. */
export const maxDuration = 60;

function json(body: Record<string, unknown>, status: number) {
  return Response.json(body, { status, headers: { "cache-control": "no-store" } });
}

/**
 * POST /api/ai-assistant/stream  { tenantSlug, message }
 * Responde em texto puro, aos poucos (streaming), enquanto a IA escreve.
 * Se algo falhar depois de a resposta já ter começado, o fim do texto traz
 * "[[erro]] mensagem". A pergunta e a resposta ficam salvas na conversa.
 */
export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as
    | { tenantSlug?: string; message?: string }
    | null;
  const tenantSlug = payload?.tenantSlug?.trim();
  const message = payload?.message?.trim();

  if (!tenantSlug || !message) {
    return json({ error: "Escreva uma mensagem antes de enviar." }, 400);
  }
  if (message.length > MAX_USER_MESSAGE_CHARS) {
    return json(
      { error: `A mensagem é longa demais (máximo ${MAX_USER_MESSAGE_CHARS} caracteres).` },
      400,
    );
  }

  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return json({ error: "Sessão expirada. Entre novamente." }, 401);

  const tenants = await getUserTenants();
  const tenant = tenants.find((t) => t.slug === tenantSlug);
  if (!tenant) return json({ error: "Você não tem acesso a esta empresa." }, 403);

  const unlocked = await isPlanFeatureUnlocked(client, tenant.id, "inteligencia_ia");
  if (!unlocked) {
    return json(
      {
        error: "O assistente de IA é um recurso do plano Essencial em diante.",
        planLocked: true,
      },
      403,
    );
  }
  if (!isAiAssistantConfigured()) {
    return json(
      { error: new AiAssistantNotConfiguredError().message, notConfigured: true },
      503,
    );
  }

  let conversationId: string;
  try {
    conversationId = await getOrCreateConversationId(client, tenant.id, user.id);
    await insertMessage(client, conversationId, "user", message);
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : "Não foi possível salvar a pergunta." },
      500,
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let completo = "";
      let falha: string | null = null;
      let clienteDesconectou = false;

      try {
        const [history, context] = await Promise.all([
          loadHistory(client, conversationId),
          buildAiAssistantRequestContext(tenant, client),
        ]);

        for await (const pedaco of streamAiAssistant(history, context, {
          signal: request.signal,
        })) {
          completo += pedaco;
          try {
            controller.enqueue(encoder.encode(pedaco));
          } catch {
            clienteDesconectou = true;
            break;
          }
        }
      } catch (error) {
        falha =
          error instanceof AiAssistantNotConfiguredError
            ? error.message
            : request.signal.aborted
              ? null
              : "Não consegui gerar a resposta agora. Tente novamente em instantes.";
        if (falha && !(error instanceof AiAssistantNotConfiguredError)) {
          console.error("[ai-assistant] falha ao gerar resposta", error);
        }
      }

      // Guarda o que a IA escreveu (inclusive resposta parcial, se a pessoa fechou o painel).
      if (completo.trim()) {
        try {
          await insertMessage(client, conversationId, "assistant", completo.trim());
        } catch (error) {
          console.error("[ai-assistant] falha ao salvar a resposta", error);
        }
      }

      if (!clienteDesconectou) {
        try {
          if (falha) controller.enqueue(encoder.encode(`\n\n${ERROR_MARKER} ${falha}`));
          controller.close();
        } catch {
          /* cliente já saiu */
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store, no-transform",
      "x-accel-buffering": "no",
    },
  });
}
