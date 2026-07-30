/**
 * Sprint 26.7 — Contrato de providers de regime.
 * Providers aplicam fórmulas genéricas sobre parâmetros — nunca alíquotas fixas.
 */

import type {
  TaxComputationInput,
  TaxComputationResult,
  TaxRegimeCode,
} from "../types.ts";

export type TaxRegimeProvider = {
  code: TaxRegimeCode;
  label: string;
  compute: (input: TaxComputationInput) => TaxComputationResult;
};
