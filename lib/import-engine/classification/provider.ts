/**
 * Sprint 22.5.1 — Ponto de extensão para classificação.
 * `RuleClassificationProvider` é a implementação Fase 1 (motor de regras).
 * Uma futura `AiClassificationProvider` pode implementar a mesma interface
 * sem exigir mudanças no `ImportEngineService` ou nos adapters de módulo.
 */
import type { ClassificationDomain, ImportClassification } from "../types/index.ts";
import {
  classifyRows,
  rulesForDomain,
  type ClassificationRule,
} from "./rule-classifier.ts";

export interface ClassificationProvider {
  readonly id: string;
  classifyRows(
    rows: Array<{ rowNumber: number; description: string }>,
    domain: ClassificationDomain,
  ): Promise<ImportClassification[]> | ImportClassification[];
}

export class RuleClassificationProvider implements ClassificationProvider {
  readonly id = "rule-engine-v1";
  private readonly rulesOverride?: Record<ClassificationDomain, ClassificationRule[]>;

  constructor(rulesOverride?: Record<ClassificationDomain, ClassificationRule[]>) {
    this.rulesOverride = rulesOverride;
  }

  classifyRows(
    rows: Array<{ rowNumber: number; description: string }>,
    domain: ClassificationDomain,
  ): ImportClassification[] {
    const rules = this.rulesOverride?.[domain] ?? rulesForDomain(domain);
    return classifyRows(rows, { rules, domain });
  }
}

export function createDefaultClassificationProvider(): ClassificationProvider {
  return new RuleClassificationProvider();
}
