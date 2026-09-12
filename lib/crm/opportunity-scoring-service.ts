import "server-only";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";
const MAX_TOKENS = 512;

export class OpportunityScoringNotConfiguredError extends Error {
  constructor() {
    super("Análise de IA ainda não foi configurada (falta a chave da Anthropic).");
    this.name = "OpportunityScoringNotConfiguredError";
  }
}

export type OpportunitySnapshot = {
  titulo: string;
  valorEstimado: number | null;
  stageKey: string;
  origem: string | null;
  produtoServico: string | null;
  diasNoFunil: number;
  probabilidadeAtual: number | null;
};

export type OpportunityScoringResult = {
  probabilidade: number;
  proximaAcao: string;
  justificativa: string;
};

const SYSTEM_PROMPT = `Você analisa oportunidades de um funil de vendas de pequenos negócios
(oficina mecânica, lava-rápido, restaurante) e responde SOMENTE com um
objeto JSON válido, sem nenhum texto antes ou depois, no formato exato:
{"probabilidade": <número inteiro de 0 a 100>, "proxima_acao": "<uma frase curta e prática, em português>", "justificativa": "<1-2 frases explicando o raciocínio>"}

Baseie a probabilidade em sinais reais fornecidos (etapa do funil, tempo
parado nessa etapa, se tem valor definido, origem do lead) — nunca invente
dado que não foi passado. Se a oportunidade estiver muito tempo parada na
mesma etapa, isso deve reduzir a probabilidade e a próxima ação deve
refletir isso (ex.: "retomar contato, já se passaram X dias sem avanço").`;

function extractJson(text: string): OpportunityScoringResult | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]) as {
      probabilidade?: unknown;
      proxima_acao?: unknown;
      justificativa?: unknown;
    };
    const probabilidade = Number(parsed.probabilidade);
    if (
      !Number.isFinite(probabilidade) ||
      probabilidade < 0 ||
      probabilidade > 100 ||
      typeof parsed.proxima_acao !== "string" ||
      typeof parsed.justificativa !== "string"
    ) {
      return null;
    }
    return {
      probabilidade: Math.round(probabilidade),
      proximaAcao: parsed.proxima_acao,
      justificativa: parsed.justificativa,
    };
  } catch {
    return null;
  }
}

export async function scoreOpportunity(
  snapshot: OpportunitySnapshot,
): Promise<OpportunityScoringResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    throw new OpportunityScoringNotConfiguredError();
  }

  const userMessage = [
    `Título: ${snapshot.titulo}`,
    `Valor estimado: ${snapshot.valorEstimado != null ? `R$ ${snapshot.valorEstimado.toFixed(2)}` : "não informado"}`,
    `Etapa atual do funil: ${snapshot.stageKey}`,
    `Dias parada nessa etapa: ${snapshot.diasNoFunil}`,
    `Origem: ${snapshot.origem ?? "não informada"}`,
    `Produto/serviço: ${snapshot.produtoServico ?? "não informado"}`,
    `Probabilidade cadastrada atualmente: ${snapshot.probabilidadeAtual ?? "não definida"}`,
  ].join("\n");

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
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
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

  const parsed = extractJson(text);
  if (!parsed) {
    throw new Error("A IA respondeu num formato inesperado. Tenta de novo.");
  }

  return parsed;
}
