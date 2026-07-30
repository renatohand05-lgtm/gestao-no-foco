/**
 * Sprint 22.7 — Interface desacoplada de provider de inteligência financeira documental.
 */

import type { DocumentDetectionResult, DreInterpretationResult, PayrollInterpretationResult } from "./types.ts";
import type { DetectDocumentInput } from "./document-detector.ts";
import type { DreInputLine } from "./dre-interpreter.ts";
import type { ClassifyContext, ClassifyRowInput, ClassificationDecision } from "./types.ts";
import type { ProviderClassifyHint } from "./classification-priority.ts";

export type IntelligenceProviderMeta = {
  id: string;
  label: string;
  /** false = nunca apresentar como IA externa */
  isExternalAi: boolean;
  attribution: string;
};

export interface FinancialIntelligenceProvider {
  readonly meta: IntelligenceProviderMeta;
  detectDocument(input: DetectDocumentInput): DocumentDetectionResult | Promise<DocumentDetectionResult>;
  interpretDre(lines: DreInputLine[]): DreInterpretationResult | Promise<DreInterpretationResult>;
  interpretPayroll(input: {
    headers: string[];
    rows: Array<Record<string, string>>;
  }): PayrollInterpretationResult | Promise<PayrollInterpretationResult>;
  suggestClassification(
    row: ClassifyRowInput,
    ctx?: ClassifyContext,
  ): ProviderClassifyHint | null | Promise<ProviderClassifyHint | null>;
  classify(
    row: ClassifyRowInput,
    ctx?: ClassifyContext,
  ): ClassificationDecision | Promise<ClassificationDecision>;
}

export const DETERMINISTIC_ATTRIBUTION =
  "Sugestão baseada em regras e histórico do tenant.";
