/**
 * Sprint 22.7 — Provider determinístico (regras + histórico). Nunca se apresenta como IA externa.
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

export class DeterministicIntelligenceProvider implements FinancialIntelligenceProvider {
  readonly meta = {
    id: "deterministic-v1",
    label: "Motor determinístico",
    isExternalAi: false,
    attribution: DETERMINISTIC_ATTRIBUTION,
  } as const;

  detectDocument(input: Parameters<FinancialIntelligenceProvider["detectDocument"]>[0]) {
    const result = detectDocumentKind(input);
    return { ...result, attribution: this.meta.attribution };
  }

  interpretDre(lines: Parameters<FinancialIntelligenceProvider["interpretDre"]>[0]) {
    const result = interpretDreLines(lines);
    return { ...result, attribution: this.meta.attribution };
  }

  interpretPayroll(input: Parameters<FinancialIntelligenceProvider["interpretPayroll"]>[0]) {
    const result = interpretPayrollRows(input);
    return { ...result, attribution: this.meta.attribution };
  }

  suggestClassification(row: ClassifyRowInput, ctx?: ClassifyContext) {
    void ctx;
    const hay = row.description.toLowerCase();
    if (hay.includes("aluguel")) {
      return {
        category: "Ocupação",
        dreGroup: "Despesas Operacionais",
        confidence: 0.9,
        reason: "Padrão determinístico aluguel",
        signals: ["deterministic:aluguel"],
      };
    }
    if (hay.includes("transferencia") || hay.includes("ted ")) {
      return {
        category: "Transferência",
        dreGroup: "Não operacional",
        isTransfer: true,
        confidence: 0.86,
        reason: "Padrão determinístico transferência",
        signals: ["deterministic:transfer"],
      };
    }
    return null;
  }

  classify(row: ClassifyRowInput, ctx?: ClassifyContext) {
    const hint = this.suggestClassification(row, ctx);
    return classifyWithPriority(row, ctx, hint);
  }
}

export function createDeterministicProvider(): FinancialIntelligenceProvider {
  return new DeterministicIntelligenceProvider();
}
