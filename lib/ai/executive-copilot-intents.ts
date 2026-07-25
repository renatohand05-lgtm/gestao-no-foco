/**
 * Executive Copilot — detecção de intenção (Gate 20.3).
 * Determinístico · palavras-chave · sem LLM.
 */

import type { ExecutiveCopilotIntent } from "./executive-copilot-types.ts";

type IntentRule = {
  intent: ExecutiveCopilotIntent;
  /** Maior = preferido em empate. */
  priority: number;
  patterns: RegExp[];
};

/**
 * Ordem de prioridade resolve colisões:
 * caixa financeiro ≠ atendimento; OS atrasada ≠ parada; cliente risco ≠ aguardando.
 */
const RULES: IntentRule[] = [
  {
    intent: "explicacao_score",
    priority: 100,
    patterns: [
      /\b(por\s*que|porque).{0,40}\bscore\b/i,
      /\bexplic.*\bscore\b/i,
      /\bscore\b.{0,20}\b(74|est[aá]|baix|alt)/i,
      /\bexecutive\s*score\b/i,
      /\bbusiness\s*health\b/i,
    ],
  },
  {
    intent: "cobertura_dados",
    priority: 95,
    patterns: [
      /\b(dados?\s+confi[aá]veis?|cobertura|confiabilidade)\b/i,
      /\besses?\s+dados?\b/i,
      /\bparcial(mente)?\b.{0,20}\bdados?\b/i,
      /\bfalta\s+de\s+(dado|informa)/i,
    ],
  },
  {
    intent: "prioridade_do_dia",
    priority: 90,
    patterns: [
      /\b(o\s+que|qual).{0,30}(resolver|fazer|executar|priorizar)\s+primeiro\b/i,
      /\bprioridade\s+do\s+dia\b/i,
      /\bexige\s+aten[cç][aã]o\s+agora\b/i,
      /\ba[cç][aã]o\s+(devo|deve)\s+executar\b/i,
    ],
  },
  {
    intent: "plano_acao",
    priority: 85,
    patterns: [
      /\bplano\s+de\s+a[cç][aã]o\b/i,
      /\brecomenda[cç][oõ]es?\b/i,
      /\bo\s+que\s+fazer\s+agora\b/i,
    ],
  },
  {
    intent: "riscos",
    priority: 80,
    patterns: [
      /\bmaiores?\s+riscos?\b/i,
      /\bquais\s+(s[aã]o\s+)?(os\s+)?(maiores?\s+)?riscos?\b/i,
      /\briscos?\s+(cr[ií]ticos?|operacionais?|do\s+neg[oó]cio)\b/i,
      /\bameaça\b/i,
    ],
  },
  {
    intent: "oportunidades",
    priority: 78,
    patterns: [
      /\boportunidades?\b/i,
      /\bganhar\s+mais\b/i,
      /\bonde\s+(posso|posso\s+ganhar|há\s+ganho)\b/i,
      /\bresultado\b.{0,15}\b(mais|melhor)\b/i,
    ],
  },
  {
    intent: "ordens_servico",
    priority: 75,
    patterns: [
      /\b(ordens?\s+de\s+servi[cç]o|ordens?\s+os|\bos\b)\b/i,
      /\bos\s+(cr[ií]ticas?|atrasadas?|paradas?)\b/i,
      /\bquais\s+os\b/i,
    ],
  },
  {
    intent: "estoque",
    priority: 86,
    patterns: [
      /\bestoque\b/i,
      /\bruptura\b/i,
      /\bfalta\s+de\s+pe[cç]as?\b/i,
      /\babaixo\s+do\s+m[ií]nimo\b/i,
      /\brisco\s+de\s+(estoque|falta|ruptura|pe[cç]as?)\b/i,
    ],
  },
  {
    intent: "crm",
    priority: 84,
    patterns: [
      /\bclientes?\s+(em\s+risco|exigem|aten[cç][aã]o)\b/i,
      /\bclientes?\s+est[aã]o\s+em\s+risco\b/i,
      /\bcrm\b/i,
      /\bcarteira\b/i,
      /\bclientes?\s+inativos?\b/i,
    ],
  },
  {
    intent: "financeiro",
    priority: 68,
    patterns: [
      /\b(caixa|fluxo\s+de\s+caixa|saldo|contas?\s+vencidas?|financeiro)\b/i,
      /\bcomo\s+est[aá]\s+(meu\s+)?caixa\b/i,
      /\bpagar\s+vencid/i,
      /\breceber\s+vencid/i,
    ],
  },
  {
    intent: "metas",
    priority: 66,
    patterns: [
      /\bmeta\b/i,
      /\bvou\s+bater\b/i,
      /\britmo\s+(da\s+)?meta\b/i,
      /\batingir\s+a\s+meta\b/i,
    ],
  },
  {
    intent: "comercial",
    priority: 64,
    patterns: [
      /\b(vendas?|faturamento|convers[aã]o|pipeline|negocia[cç][aã]o|comercial)\b/i,
      /\bcomo\s+est[aã]o\s+(minhas\s+)?vendas\b/i,
    ],
  },
  {
    intent: "operacao",
    priority: 62,
    patterns: [
      /\boficina\b/i,
      /\bopera[cç][aã]o\b/i,
      /\batrasad[ao]s?\b/i,
      /\bprodutividade\b/i,
      /\bsla\b/i,
    ],
  },
  {
    intent: "visao_geral",
    priority: 50,
    patterns: [
      /\bcomo\s+est[aá]\s+(a\s+)?(minha\s+)?empresa\b/i,
      /\bvis[aã]o\s+geral\b/i,
      /\bsa[uú]de\s+(da\s+)?empresa\b/i,
      /\bpand?orama\b/i,
      /\bhoje\b.{0,20}\bempresa\b/i,
    ],
  },
];

/**
 * Detecta intenção. Em empate de score, usa `priority` da regra.
 * Ambiguidade caixa: "caixa" sozinho → financeiro; "caixa de atendimento" não casa financeiro sem outras palavras.
 */
export function detectExecutiveCopilotIntent(
  query: string,
): ExecutiveCopilotIntent {
  const q = query.trim();
  if (!q) return "unknown";

  // Desambiguação: caixa de atendimento ≠ financeiro
  const atendimentoCaixa =
    /\bcaixa\s+de\s+atendimento\b/i.test(q) ||
    /\batendimento\b.{0,15}\bcaixa\b/i.test(q);

  let best: { intent: ExecutiveCopilotIntent; score: number } | null = null;

  for (const rule of RULES) {
    if (rule.intent === "financeiro" && atendimentoCaixa) continue;

    let hits = 0;
    for (const re of rule.patterns) {
      if (re.test(q)) hits += 1;
    }
    if (hits === 0) continue;

    const score = hits * 10 + rule.priority;
    if (!best || score > best.score) {
      best = { intent: rule.intent, score };
    }
  }

  return best?.intent ?? "unknown";
}

export function listSupportedIntentLabels(): string[] {
  return [
    "Como está minha empresa hoje?",
    "O que devo resolver primeiro?",
    "Como está meu caixa?",
    "Como estão minhas vendas?",
    "Minha oficina está atrasada?",
    "Tenho risco de falta de peças?",
    "Quais clientes exigem atenção?",
    "Quais OS precisam de ação?",
    "Vou bater a meta?",
    "Quais são os maiores riscos?",
    "Onde posso ganhar mais resultado?",
    "Qual plano de ação recomendado?",
    "Por que meu score está assim?",
    "Esses dados são confiáveis?",
  ];
}
