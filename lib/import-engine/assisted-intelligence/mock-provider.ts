/**
 * Sprint 22.7 — Provider mock apenas para testes. Não usar em runtime de produção.
 */

import { classifyWithPriority } from "./classification-priority.ts";
import { detectDocumentKind } from "./document-detector.ts";
import { interpretDreLines } from "./dre-interpreter.ts";
import { interpretPayrollRows } from "./payroll-interpreter.ts";
import {
  DETERMINISTIC_ATTRIBUTION,
  type FinancialIntelligenceProvider,
} from "./provider.ts";
import type { ClassifyContext, ClassifyRowInput } from "./types.ts";

export class MockIntelligenceProvider implements FinancialIntelligenceProvider {
  readonly meta = {
    id: "mock-v1",
    label: "Mock de testes",
    isExternalAi: false,
    attribution: DETERMINISTIC_ATTRIBUTION,
  } as const;

  private forcedCategory: string | undefined;

  constructor(forcedCategory?: string) {
    this.forcedCategory = forcedCategory;
  }

  detectDocument(input: Parameters<FinancialIntelligenceProvider["detectDocument"]>[0]) {
    return detectDocumentKind(input);
  }

  interpretDre(lines: Parameters<FinancialIntelligenceProvider["interpretDre"]>[0]) {
    return interpretDreLines(lines);
  }

  interpretPayroll(input: Parameters<FinancialIntelligenceProvider["interpretPayroll"]>[0]) {
    return interpretPayrollRows(input);
  }

  suggestClassification(row: ClassifyRowInput, ctx?: ClassifyContext) {
    void row;
    void ctx;
    return {
      category: this.forcedCategory ?? "Mock Category",
      dreGroup: "Mock DRE",
      confidence: 0.55,
      reason: "Sugestão mock controlada para testes",
      signals: ["mock"],
    };
  }

  classify(row: ClassifyRowInput, ctx?: ClassifyContext) {
    return classifyWithPriority(row, ctx, this.suggestClassification(row, ctx));
  }
}

export function createMockProvider(forcedCategory?: string): FinancialIntelligenceProvider {
  return new MockIntelligenceProvider(forcedCategory);
}
