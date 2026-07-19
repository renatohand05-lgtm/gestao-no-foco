/**
 * Regras de composição — apenas classificação / texto já existente.
 * Sem novos thresholds. Sem inventar causas.
 * Patterns operam sobre texto já normalizado (sem acento).
 */

import type {
  ExecutiveInsightCategory,
  ExecutiveInsightType,
} from "@/lib/executive-insights/executive-insight-types";

export type InsightThemeRule = {
  id: string;
  themeKey: string;
  category: ExecutiveInsightCategory;
  /** Padrões sobre texto normalizado (sem acento, minúsculas) */
  patterns: RegExp[];
  preferredType?: ExecutiveInsightType;
};

/** Temas semânticos para deduplicação entre motores. */
export const INSIGHT_THEME_RULES: InsightThemeRule[] = [
  {
    id: "proj_abaixo",
    themeKey: "projecao_abaixo_meta",
    category: "projecao",
    preferredType: "critical",
    patterns: [
      /projecao.*abaixo/,
      /fechamento abaixo da meta/,
      /abaixo da meta/,
    ],
  },
  {
    id: "proj_acima",
    themeKey: "projecao_acima_meta",
    category: "projecao",
    preferredType: "positive",
    patterns: [/projecao.*acima/, /acima da meta/, /super.*meta/],
  },
  {
    id: "ritmo_baixo",
    themeKey: "ritmo_abaixo",
    category: "ritmo",
    preferredType: "warning",
    patterns: [
      /ritmo.*abaixo/,
      /abaixo do necess/,
      /venda media diaria precisa/,
      /necessario.*dia/,
    ],
  },
  {
    id: "ritmo_acima",
    themeKey: "ritmo_acima",
    category: "ritmo",
    preferredType: "positive",
    patterns: [/ritmo.*acima/, /acima do necess/, /no ritmo/],
  },
  {
    id: "meta_atingida",
    themeKey: "meta_atingida",
    category: "metas",
    preferredType: "positive",
    patterns: [/meta atingida/, /meta alcanc/],
  },
  {
    id: "meta_superada",
    themeKey: "meta_superada",
    category: "metas",
    preferredType: "positive",
    patterns: [/meta superada/, /superou a meta/],
  },
  {
    id: "sem_meta",
    themeKey: "sem_meta",
    category: "metas",
    preferredType: "informational",
    patterns: [/sem meta/, /nenhuma meta/, /meta nao cadastr/],
  },
  {
    id: "poucos_dados",
    themeKey: "poucos_dados",
    category: "geral",
    preferredType: "informational",
    patterns: [
      /dados insuficientes/,
      /poucos dados/,
      /ainda insuficientes/,
      /sem movimento/,
      /sem vendas/,
    ],
  },
  {
    id: "ticket",
    themeKey: "ticket",
    category: "ticket",
    patterns: [/ticket/, /ticket medio/],
  },
  {
    id: "tendencia_queda",
    themeKey: "tendencia_queda",
    category: "vendas",
    preferredType: "warning",
    patterns: [/desacelera/, /tendencia.*queda/, /decrescente/],
  },
  {
    id: "tendencia_alta",
    themeKey: "tendencia_alta",
    category: "vendas",
    preferredType: "positive",
    patterns: [/acelera/, /tendencia.*alta/, /crescente/],
  },
  {
    id: "recuperacao",
    themeKey: "oportunidade_recuperacao",
    category: "projecao",
    preferredType: "opportunity",
    patterns: [/recuperacao/, /recuperar/],
  },
];

export function normalizeInsightText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function resolveThemeKey(title: string, summary?: string): string {
  const blob = normalizeInsightText(`${title} ${summary ?? ""}`);
  for (const rule of INSIGHT_THEME_RULES) {
    if (rule.patterns.some((p) => p.test(blob))) {
      return rule.themeKey;
    }
  }
  return `unique:${normalizeInsightText(title).slice(0, 64)}`;
}

export function resolveCategoryForTheme(
  themeKey: string,
): ExecutiveInsightCategory {
  const rule = INSIGHT_THEME_RULES.find((r) => r.themeKey === themeKey);
  return rule?.category ?? "geral";
}
