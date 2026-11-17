import "server-only";

import {
  buildAnthropicBody,
  SseParser,
  textoDoEvento,
  type AiAssistantChatMessage,
  type AiAssistantRequestContext,
} from "./ai-assistant-request";

export type { AiAssistantChatMessage, AiAssistantRequestContext };

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

/**
 * Modelo principal: um nível acima do Haiku antigo, que é o que dá respostas
 * analíticas e planos de ação de verdade. Pode ser trocado sem novo deploy
 * pela variável AI_ASSISTANT_MODEL. Se o modelo principal não existir ou
 * estiver sobrecarregado, cai para o modelo de reserva em vez de quebrar.
 */
const DEFAULT_MODEL = "claude-sonnet-5-5";
const FALLBACK_MODEL = "claude-haiku-4-5-20251001";

/** Tempo máximo esperando a IA (a rota roda com maxDuration de 60s). */
const REQUEST_TIMEOUT_MS = 55_000;

export class AiAssistantNotConfiguredError extends Error {
  constructor() {
    super(
      "O assistente de IA ainda não foi configurado (falta a chave da Anthropic).",
    );
    this.name = "AiAssistantNotConfiguredError";
  }
}

export function isAiAssistantConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

function modelosParaTentar(): string[] {
  const principal = process.env.AI_ASSISTANT_MODEL?.trim() || DEFAULT_MODEL;
  return principal === FALLBACK_MODEL ? [principal] : [principal, FALLBACK_MODEL];
}

async function abrirStream(
  history: AiAssistantChatMessage[],
  context: AiAssistantRequestContext,
  signal: AbortSignal,
): Promise<Response> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) throw new AiAssistantNotConfiguredError();

  let ultimoErro: Error | null = null;
  for (const model of modelosParaTentar()) {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(
        buildAnthropicBody({ model, history, context, stream: true }),
      ),
      signal,
    });

    if (response.ok && response.body) return response;

    const corpo = await response.text().catch(() => "");
    ultimoErro = new Error(
      `Falha ao chamar a IA (status ${response.status}): ${corpo.slice(0, 300)}`,
    );
    // modelo inexistente (404), limite (429) ou instabilidade (5xx): tenta o modelo de reserva
    const podeTentarOutro =
      response.status === 404 || response.status === 429 || response.status >= 500;
    if (!podeTentarOutro) break;
  }
  throw ultimoErro ?? new Error("Falha ao chamar a IA.");
}

/**
 * Resposta da IA em pedaços de texto, conforme ela escreve.
 * Lança AiAssistantNotConfiguredError se a chave ainda não foi configurada.
 */
export async function* streamAiAssistant(
  history: AiAssistantChatMessage[],
  context: AiAssistantRequestContext,
  options: { signal?: AbortSignal } = {},
): AsyncGenerator<string, void, void> {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;

  const response = await abrirStream(history, context, signal);
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  const parser = new SseParser();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      for (const event of parser.push(decoder.decode(value, { stream: true }))) {
        const texto = textoDoEvento(event);
        if (texto) yield texto;

        if (event.type === "error") {
          throw new Error(
            `A IA interrompeu a resposta: ${event.error?.message ?? event.error?.type ?? "erro desconhecido"}`,
          );
        }
        if (event.type === "message_delta" && event.delta?.stop_reason === "max_tokens") {
          yield "\n\n_(Resposta cortada pelo limite de tamanho — peça \"continue\" para ver o resto.)_";
        }
      }
    }
  } finally {
    reader.cancel().catch(() => undefined);
  }
}

/**
 * Chama a IA e devolve a resposta completa (usado onde não há streaming,
 * como o app mobile). Lança AiAssistantNotConfiguredError se faltar a chave.
 */
export async function callAiAssistant(
  history: AiAssistantChatMessage[],
  context: AiAssistantRequestContext,
): Promise<string> {
  let texto = "";
  for await (const pedaco of streamAiAssistant(history, context)) texto += pedaco;
  texto = texto.trim();
  return texto || "Não consegui gerar uma resposta agora. Tenta de novo?";
}
