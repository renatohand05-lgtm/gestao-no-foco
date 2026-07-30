/**
 * Sprint 22.6 — Aplica regras aprendidas por tenant sobre a classificação
 * de base (`RuleClassificationProvider`). Regras aprendidas têm prioridade:
 * quando uma linha corresponde a um padrão aprendido, a sugestão do motor
 * estático é substituída pela sugestão aprendida.
 */
import { classifyRows, rulesForDomain } from "../classification/rule-classifier.ts";
import { normalizeText, stripDiacritics } from "../parsers/normalize.ts";
import type {
  ClassificationDomain,
  ImportClassification,
  ImportLearningRule,
} from "../types/index.ts";

function normalizeForMatch(value: string): string {
  return stripDiacritics(normalizeText(value)).toLowerCase();
}

function findBestLearnedMatch(
  rules: ImportLearningRule[],
  description: string,
): ImportLearningRule | null {
  const hay = normalizeForMatch(description);
  if (!hay) return null;
  let best: ImportLearningRule | null = null;
  for (const rule of rules) {
    if (!rule.isActive) continue;
    const hit = rule.patterns.some((p) => hay.includes(String(p).toLowerCase()));
    if (hit && (!best || rule.confidence > best.confidence)) {
      best = rule;
    }
  }
  return best;
}

/**
 * Classifica linhas combinando o motor de regras estático (Fase 1) com as
 * regras aprendidas do tenant (prioridade mais alta quando há correspondência).
 */
export function classifyRowsWithLearning(
  rows: Array<{ rowNumber: number; description: string }>,
  domain: ClassificationDomain,
  learnedRules: ImportLearningRule[] = [],
): ImportClassification[] {
  const base = classifyRows(rows, { domain, rules: rulesForDomain(domain) });
  if (!learnedRules.length) return base;

  const byRow = new Map(base.map((c) => [c.rowNumber, c]));
  for (const row of rows) {
    const match = findBestLearnedMatch(learnedRules, row.description);
    if (!match) continue;
    byRow.set(row.rowNumber, {
      rowNumber: row.rowNumber,
      categorySuggested: match.categorySuggested,
      subcategorySuggested: match.subcategorySuggested,
      costCenterSuggested: match.costCenterSuggested,
      dreGroupSuggested: match.dreGroupSuggested,
      confidence: match.confidence,
      reason: `Aprendido: ${match.reason}`,
      status: match.confidence >= 0.75 ? "auto" : "low_confidence",
    });
  }
  return rows.map((r) => byRow.get(r.rowNumber)!);
}
