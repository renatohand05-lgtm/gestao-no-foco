import "server-only";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";
const MAX_TOKENS = 1024;

export type AiAssistantChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export class AiAssistantNotConfiguredError extends Error {
  constructor() {
    super(
      "O assistente de IA ainda não foi configurado (falta a chave da Anthropic).",
    );
    this.name = "AiAssistantNotConfiguredError";
  }
}

function buildSystemPrompt(dataContext: string): string {
  return [
    "Você é o Assistente do Gestão no Foco, uma plataforma de gestão para " +
      "pequenos negócios nos segmentos de Oficina mecânica, Lava-rápido e " +
      "Restaurante — cobrindo cadastro de clientes/veículos/mesas, ordens de " +
      "serviço, vendas, financeiro (contas a pagar/receber, DRE, fluxo de " +
      "caixa, tributos) e um painel de suporte.",
    "Seu papel é ajudar a pessoa a USAR o sistema (onde encontrar cada " +
      "tela, como fazer uma tarefa, o que significa cada campo ou relatório) " +
      "e, quando fizer sentido, responder perguntas sobre os DADOS REAIS da " +
      "empresa dela usando exclusivamente o resumo abaixo.",
    "Regras importantes:",
    "- Nunca invente números. Se a pergunta exigir um dado que não está no " +
      "resumo abaixo, diga claramente que não tem essa informação disponível " +
      "ainda e sugira onde a pessoa pode encontrá-la dentro do sistema " +
      "(ex.: 'isso você confere em Financeiro > DRE').",
    "- Seja direto, curto e prático. Respostas de 2 a 5 frases na maioria " +
      "das vezes; só se alongue se a pergunta pedir explicação detalhada.",
    "- Se a pergunta não tiver nada a ver com o sistema Gestão no Foco, " +
      "responda educadamente que seu foco é ajudar com o sistema.",
    "- Você não executa ações no sistema (não cria, edita ou apaga nada) — " +
      "só orienta e explica.",
    "",
    "Resumo dos dados reais desta empresa agora:",
    dataContext,
  ].join("\n");
}

/**
 * Chama a API da Anthropic com o histórico da conversa + contexto de dados.
 * Lança AiAssistantNotConfiguredError se a chave ainda não foi configurada.
 */
export async function callAiAssistant(
  history: AiAssistantChatMessage[],
  dataContext: string,
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    throw new AiAssistantNotConfiguredError();
  }

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: MAX_TOKENS,
      system: buildSystemPrompt(dataContext),
      messages: history.map((m) => ({ role: m.role, content: m.content })),
    }),
  });

  if (!response.ok) {
    const bodyText = await response.text().catch(() => "");
    throw new Error(
      `Falha ao chamar a IA (status ${response.status}): ${bodyText.slice(0, 300)}`,
    );
  }

  const data = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };

  const text = (data.content ?? [])
    .filter((block) => block.type === "text" && block.text)
    .map((block) => block.text)
    .join("\n")
    .trim();

  return text || "Não consegui gerar uma resposta agora. Tenta de novo?";
}
