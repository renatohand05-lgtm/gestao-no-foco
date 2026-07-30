/**
 * Sprint 22.7 — Interpretação de folha com mascaramento de PII.
 */

import { stripDiacritics, normalizeText } from "../parsers/normalize.ts";
import { confidenceBand, clampConfidence } from "./confidence.ts";
import { scanImportedContent } from "./prompt-injection.ts";
import type {
  ExplainedSuggestion,
  PayrollField,
  PayrollInterpretationResult,
  PayrollLineInterpretation,
} from "./types.ts";

const ATTRIBUTION =
  "Sugestão baseada em regras e histórico do tenant.";

const HEADER_TO_FIELD: Array<{ field: PayrollField; headers: string[] }> = [
  { field: "collaborator", headers: ["colaborador", "funcionario", "nome", "empregado"] },
  { field: "role", headers: ["cargo", "funcao", "posto"] },
  { field: "salary", headers: ["salario", "salario base", "vencimento"] },
  { field: "pro_labore", headers: ["pro-labore", "pro labore", "prolabore"] },
  { field: "benefits", headers: ["beneficios", "vale", "vr", "vt"] },
  { field: "charges", headers: ["encargos", "encargos sociais"] },
  { field: "fgts", headers: ["fgts"] },
  { field: "inss", headers: ["inss"] },
  { field: "vacation", headers: ["ferias"] },
  { field: "thirteenth", headers: ["13", "decimo terceiro", "13o"] },
  { field: "deductions", headers: ["descontos", "desconto"] },
  { field: "gross_total", headers: ["bruto", "total bruto", "proventos"] },
  { field: "net_total", headers: ["liquido", "total liquido", "a receber"] },
  { field: "cost_center", headers: ["centro de custo", "cc", "c.c."] },
  { field: "competence", headers: ["competencia", "referencia", "mes"] },
];

function norm(s: string): string {
  return stripDiacritics(normalizeText(s)).toLowerCase();
}

function maskName(value: string): string {
  const parts = value.trim().split(/\s+/);
  if (parts.length === 0) return "***";
  return parts
    .map((p, i) => (i === 0 ? p : p.slice(0, 1) + "***"))
    .join(" ");
}

function suggest(
  value: string | null,
  confidence: number,
  reason: string,
  signals: string[],
): ExplainedSuggestion {
  return {
    value,
    confidence: clampConfidence(confidence),
    band: confidenceBand(confidence),
    origin: "deterministic_rule",
    reason,
    signals,
    alternatives: [],
    attribution: ATTRIBUTION,
  };
}

export function interpretPayrollRows(input: {
  headers: string[];
  rows: Array<Record<string, string>>;
}): PayrollInterpretationResult {
  const headerMap = new Map<string, PayrollField>();
  for (const h of input.headers) {
    const hn = norm(h);
    scanImportedContent(h); // trata cabeçalho como dado
    for (const m of HEADER_TO_FIELD) {
      if (m.headers.some((x) => hn.includes(x))) {
        headerMap.set(h, m.field);
        break;
      }
    }
  }

  const lines: PayrollLineInterpretation[] = input.rows.map((row) => {
    const mapped: Partial<Record<PayrollField, ExplainedSuggestion>> = {};
    const maskedPii: Record<string, string> = {};
    for (const [header, value] of Object.entries(row)) {
      const field = headerMap.get(header);
      if (!field) continue;
      const scan = scanImportedContent(value);
      const conf = field === "collaborator" ? 0.9 : 0.88;
      mapped[field] = suggest(
        scan.sanitizedText,
        conf,
        `Cabeçalho "${header}" mapeado para ${field}`,
        [`header:${norm(header)}`],
      );
      if (field === "collaborator") {
        maskedPii[header] = maskName(scan.sanitizedText);
      }
    }
    return { originalCells: row, mapped, maskedPii };
  });

  return {
    lines,
    requiresHumanConfirmation: true,
    attribution: ATTRIBUTION,
  };
}
