/**
 * Sprint 22.5.1 — Compatibilidade. Lógica movida para `classification/`.
 * Mantido apenas para não quebrar imports existentes.
 * @deprecated importe de `lib/import-engine/classification` ou do índice principal.
 */
export {
  classifyDescription,
  classifyRows,
  DEFAULT_CLASSIFICATION_RULES,
  type ClassificationRule,
} from "../classification/rule-classifier.ts";
