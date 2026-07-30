/**
 * Sprint 22.5.1 — Classificação por regras, multi-módulo.
 * Fase 1: motor de regras determinístico (sem IA generativa).
 * Ver `ClassificationProvider` para o ponto de extensão futuro (IA).
 */
import type {
  ClassificationDomain,
  ImportClassification,
} from "../types/index.ts";
import { normalizeText, stripDiacritics } from "../parsers/normalize.ts";

export type ClassificationRule = {
  id: string;
  patterns: string[];
  categorySuggested: string;
  subcategorySuggested?: string | null;
  costCenterSuggested?: string | null;
  dreGroupSuggested?: string | null;
  confidence: number;
  reason: string;
};

/** Financeiro — regras originais da Sprint 22.5 (inalteradas). */
export const FINANCE_CLASSIFICATION_RULES: ClassificationRule[] = [
  {
    id: "enel",
    patterns: ["enel", "eletropaulo", "cpfl", "light energia", "energisa"],
    categorySuggested: "Energia Elétrica",
    subcategorySuggested: "Utilidades",
    dreGroupSuggested: "Despesas Operacionais",
    confidence: 0.95,
    reason: "Correspondência com concessionária de energia",
  },
  {
    id: "sabesp",
    patterns: ["sabesp", "agua e esgoto", "água e esgoto", "saneamento"],
    categorySuggested: "Água",
    subcategorySuggested: "Utilidades",
    dreGroupSuggested: "Despesas Operacionais",
    confidence: 0.95,
    reason: "Correspondência com concessionária de água",
  },
  {
    id: "aluguel",
    patterns: ["aluguel", "locacao", "locação", "rent"],
    categorySuggested: "Aluguel",
    subcategorySuggested: "Ocupação",
    dreGroupSuggested: "Despesas Operacionais",
    confidence: 0.9,
    reason: "Palavra-chave de aluguel/locação",
  },
  {
    id: "folha",
    patterns: ["folha", "salario", "salário", "pro-labore", "pró-labore"],
    categorySuggested: "Folha de Pagamento",
    subcategorySuggested: "Pessoal",
    dreGroupSuggested: "Despesas com Pessoal",
    confidence: 0.92,
    reason: "Palavra-chave de folha/salário",
  },
  {
    id: "fgts",
    patterns: ["fgts"],
    categorySuggested: "Encargos",
    subcategorySuggested: "FGTS",
    dreGroupSuggested: "Despesas com Pessoal",
    confidence: 0.96,
    reason: "Correspondência FGTS",
  },
  {
    id: "darf",
    patterns: ["darf", "gps", "das ", "simples nacional", "irrf", "inss"],
    categorySuggested: "Impostos",
    subcategorySuggested: "Tributos",
    dreGroupSuggested: "Impostos e Taxas",
    confidence: 0.9,
    reason: "Guia/tributo identificado",
  },
  {
    id: "telecom",
    patterns: ["vivo", "claro", "tim ", "oi ", "internet", "telefonia"],
    categorySuggested: "Telecomunicações",
    subcategorySuggested: "Utilidades",
    dreGroupSuggested: "Despesas Operacionais",
    confidence: 0.85,
    reason: "Operadora/telecom",
  },
];

/** Vendas — regras de exemplo (forma de pagamento / natureza da venda). */
export const SALES_CLASSIFICATION_RULES: ClassificationRule[] = [
  {
    id: "pix",
    patterns: ["pix"],
    categorySuggested: "PIX",
    subcategorySuggested: "Forma de Pagamento",
    dreGroupSuggested: null,
    confidence: 0.93,
    reason: "Forma de pagamento identificada: PIX",
  },
  {
    id: "boleto",
    patterns: ["boleto"],
    categorySuggested: "Boleto",
    subcategorySuggested: "Forma de Pagamento",
    dreGroupSuggested: null,
    confidence: 0.9,
    reason: "Forma de pagamento identificada: Boleto",
  },
  {
    id: "cartao",
    patterns: ["cartao", "cartão", "credito", "crédito", "debito", "débito"],
    categorySuggested: "Cartão",
    subcategorySuggested: "Forma de Pagamento",
    dreGroupSuggested: null,
    confidence: 0.88,
    reason: "Forma de pagamento identificada: Cartão",
  },
  {
    id: "a-vista",
    patterns: ["vista", "a vista", "à vista"],
    categorySuggested: "Venda à Vista",
    subcategorySuggested: "Condição de Pagamento",
    dreGroupSuggested: null,
    confidence: 0.75,
    reason: "Condição de pagamento: à vista",
  },
  {
    id: "a-prazo",
    patterns: ["prazo", "parcelado"],
    categorySuggested: "Venda a Prazo",
    subcategorySuggested: "Condição de Pagamento",
    dreGroupSuggested: null,
    confidence: 0.75,
    reason: "Condição de pagamento: a prazo",
  },
  {
    id: "servico",
    patterns: ["servico", "serviço"],
    categorySuggested: "Serviço",
    subcategorySuggested: "Natureza do Item",
    dreGroupSuggested: null,
    confidence: 0.8,
    reason: "Item de natureza serviço",
  },
  {
    id: "produto",
    patterns: ["produto", "peca", "peça"],
    categorySuggested: "Produto",
    subcategorySuggested: "Natureza do Item",
    dreGroupSuggested: null,
    confidence: 0.8,
    reason: "Item de natureza produto",
  },
];

/** Ordens de Serviço — regras de exemplo (tipo de serviço). */
export const SERVICE_ORDERS_CLASSIFICATION_RULES: ClassificationRule[] = [
  {
    id: "revisao",
    patterns: ["revisao", "revisão"],
    categorySuggested: "Revisão",
    subcategorySuggested: "Manutenção Preventiva",
    dreGroupSuggested: null,
    confidence: 0.9,
    reason: "Serviço identificado: Revisão",
  },
  {
    id: "troca-oleo",
    patterns: ["troca oleo", "troca óleo", "troca de oleo", "troca de óleo"],
    categorySuggested: "Troca de Óleo",
    subcategorySuggested: "Manutenção Preventiva",
    dreGroupSuggested: null,
    confidence: 0.93,
    reason: "Serviço identificado: Troca de Óleo",
  },
  {
    id: "funilaria",
    patterns: ["funilaria", "lataria"],
    categorySuggested: "Funilaria",
    subcategorySuggested: "Manutenção Corretiva",
    dreGroupSuggested: null,
    confidence: 0.9,
    reason: "Serviço identificado: Funilaria",
  },
  {
    id: "eletrica",
    patterns: ["eletrica", "elétrica"],
    categorySuggested: "Elétrica",
    subcategorySuggested: "Manutenção Corretiva",
    dreGroupSuggested: null,
    confidence: 0.88,
    reason: "Serviço identificado: Elétrica",
  },
  {
    id: "diagnostico",
    patterns: ["diagnostico", "diagnóstico", "scanner"],
    categorySuggested: "Diagnóstico",
    subcategorySuggested: "Serviço Técnico",
    dreGroupSuggested: null,
    confidence: 0.85,
    reason: "Serviço identificado: Diagnóstico",
  },
];

export const DEFAULT_CLASSIFICATION_RULES = FINANCE_CLASSIFICATION_RULES;

const RULES_BY_DOMAIN: Record<ClassificationDomain, ClassificationRule[]> = {
  finance: FINANCE_CLASSIFICATION_RULES,
  sales: SALES_CLASSIFICATION_RULES,
  "service-orders": SERVICE_ORDERS_CLASSIFICATION_RULES,
};

export function rulesForDomain(
  domain: ClassificationDomain = "finance",
): ClassificationRule[] {
  return RULES_BY_DOMAIN[domain] ?? FINANCE_CLASSIFICATION_RULES;
}

function normalizeForMatch(text: string): string {
  return stripDiacritics(normalizeText(text)).toLowerCase();
}

export type ClassifyOptions = {
  domain?: ClassificationDomain;
  rules?: ClassificationRule[];
  lowConfidenceThreshold?: number;
};

export function classifyDescription(
  description: string,
  optionsOrRules: ClassifyOptions | ClassificationRule[] = {},
  lowConfidenceThresholdLegacy = 0.75,
): ImportClassification {
  // Compat: assinatura antiga `classifyDescription(text, rules?, threshold?)`.
  const options: ClassifyOptions = Array.isArray(optionsOrRules)
    ? { rules: optionsOrRules, lowConfidenceThreshold: lowConfidenceThresholdLegacy }
    : optionsOrRules;

  const rules = options.rules ?? rulesForDomain(options.domain ?? "finance");
  const lowConfidenceThreshold = options.lowConfidenceThreshold ?? 0.75;

  const hay = normalizeForMatch(description);
  if (!hay) {
    return {
      rowNumber: 0,
      categorySuggested: null,
      subcategorySuggested: null,
      costCenterSuggested: null,
      dreGroupSuggested: null,
      confidence: 0,
      reason: "Descrição vazia",
      status: "unclassified",
    };
  }

  let best: ClassificationRule | null = null;
  for (const rule of rules) {
    const hit = rule.patterns.some((p) =>
      hay.includes(normalizeForMatch(p)),
    );
    if (hit && (!best || rule.confidence > best.confidence)) {
      best = rule;
    }
  }

  if (!best) {
    return {
      rowNumber: 0,
      categorySuggested: null,
      subcategorySuggested: null,
      costCenterSuggested: null,
      dreGroupSuggested: null,
      confidence: 0.2,
      reason: "Não identificado pelo motor de regras",
      status: "unclassified",
    };
  }

  const status =
    best.confidence < lowConfidenceThreshold ? "low_confidence" : "auto";

  return {
    rowNumber: 0,
    categorySuggested: best.categorySuggested,
    subcategorySuggested: best.subcategorySuggested ?? null,
    costCenterSuggested: best.costCenterSuggested ?? null,
    dreGroupSuggested: best.dreGroupSuggested ?? null,
    confidence: best.confidence,
    reason: best.reason,
    status,
  };
}

export function classifyRows(
  rows: Array<{ rowNumber: number; description: string }>,
  optionsOrRules: ClassifyOptions | ClassificationRule[] = {},
): ImportClassification[] {
  return rows.map((r) => {
    const c = classifyDescription(r.description, optionsOrRules);
    return { ...c, rowNumber: r.rowNumber };
  });
}
