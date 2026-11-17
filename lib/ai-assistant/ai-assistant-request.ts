/**
 * Montagem do pedido à API da Anthropic e leitura da resposta em streaming.
 * Funções puras (sem fetch, sem segredos) — testáveis em Node.
 */

import { textoSemSugestoes } from "./ai-assistant-format.ts";
import { buildSystemPrompt } from "./ai-assistant-prompt.ts";

export type AiAssistantChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AiAssistantRequestContext = {
  tenantSlug: string;
  segment: string | null;
  /** Texto com os DADOS da empresa (parte variável do prompt). */
  dataContext: string;
  /** "texto" = sem Markdown (app mobile). Padrão: "markdown". */
  formato?: "markdown" | "texto";
};

/** Quantas mensagens anteriores seguem para a IA (as mais recentes). */
export const MAX_HISTORY_MESSAGES = 20;
/** Teto de tamanho da resposta — planos de ação estruturados precisam de espaço. */
export const MAX_OUTPUT_TOKENS = 3000;
/** Tamanho máximo de uma pergunta do usuário. */
export const MAX_USER_MESSAGE_CHARS = 4000;

const AVISO_FORMATO_TEXTO = `

## Formato desta conversa (sobrescreve a seção "Formato da resposta")
Esta resposta aparece em um aplicativo de celular que NÃO renderiza Markdown. Escreva em texto simples: sem #, sem tabelas, sem links em Markdown. Use frases curtas, listas numeradas ("1.", "2.") e linhas em branco para separar blocos. Em vez de tabela de plano de ação, escreva cada ação como um item numerado: "1. Ação — como fazer — prazo — impacto". Não escreva a linha de perguntas sugeridas.`;

/**
 * Deixa o histórico no formato que a API aceita: sem o marcador de
 * sugestões, sem mensagens vazias, só as mais recentes, começando por uma
 * mensagem do usuário e alternando os papéis.
 */
export function prepararHistorico(
  history: AiAssistantChatMessage[],
): AiAssistantChatMessage[] {
  const limpas = history
    .map((m) => ({
      role: m.role,
      content: (m.role === "assistant" ? textoSemSugestoes(m.content) : m.content).trim(),
    }))
    .filter((m) => m.content.length > 0)
    .slice(-MAX_HISTORY_MESSAGES);

  while (limpas.length > 0 && limpas[0].role !== "user") limpas.shift();

  const alternadas: AiAssistantChatMessage[] = [];
  for (const m of limpas) {
    const ultima = alternadas[alternadas.length - 1];
    if (ultima && ultima.role === m.role) {
      ultima.content = `${ultima.content}\n\n${m.content}`;
    } else {
      alternadas.push({ ...m });
    }
  }
  return alternadas;
}

export function buildAnthropicBody(input: {
  model: string;
  history: AiAssistantChatMessage[];
  context: AiAssistantRequestContext;
  stream: boolean;
}) {
  const { model, history, context, stream } = input;
  const instrucoes =
    buildSystemPrompt({ tenantSlug: context.tenantSlug, segment: context.segment }) +
    (context.formato === "texto" ? AVISO_FORMATO_TEXTO : "");

  return {
    model,
    max_tokens: MAX_OUTPUT_TOKENS,
    stream,
    // O cache vale para as instruções + os dados juntos: perguntas seguidas
    // na mesma conversa reaproveitam esse bloco (mais rápido e mais barato).
    system: [
      { type: "text", text: instrucoes },
      {
        type: "text",
        text: context.dataContext,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: prepararHistorico(history),
  };
}

export type AnthropicStreamEvent = {
  type: string;
  delta?: { type?: string; text?: string; stop_reason?: string | null };
  error?: { type?: string; message?: string };
};

/** Leitor incremental de Server-Sent Events: entrega eventos JSON completos. */
export class SseParser {
  private buffer = "";

  push(chunk: string): AnthropicStreamEvent[] {
    this.buffer += chunk;
    const events: AnthropicStreamEvent[] = [];
    const parts = this.buffer.split(/\r?\n\r?\n/);
    this.buffer = parts.pop() ?? "";
    for (const part of parts) {
      const data = part
        .split(/\r?\n/)
        .filter((l) => l.startsWith("data:"))
        .map((l) => l.slice(5).trim())
        .join("");
      if (!data || data === "[DONE]") continue;
      try {
        events.push(JSON.parse(data) as AnthropicStreamEvent);
      } catch {
        /* evento quebrado: ignora e segue */
      }
    }
    return events;
  }
}

/** Texto novo contido no evento, se houver. */
export function textoDoEvento(event: AnthropicStreamEvent): string | null {
  if (
    event.type === "content_block_delta" &&
    event.delta?.type === "text_delta" &&
    typeof event.delta.text === "string"
  ) {
    return event.delta.text;
  }
  return null;
}
