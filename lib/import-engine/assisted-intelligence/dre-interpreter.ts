/**
 * Sprint 22.7 — Interpretação de DRE (nomenclatura variável, valores intactos).
 */

import { stripDiacritics, normalizeText } from "../parsers/normalize.ts";
import { clampConfidence } from "./confidence.ts";
import { scanImportedContent } from "./prompt-injection.ts";
import type { DreInterpretationResult, DreLineInterpretation } from "./types.ts";

const ATTRIBUTION =
  "Sugestão baseada em regras e histórico do tenant.";

const LABEL_MAP: Array<{
  id: DreLineInterpretation["recognizedAs"];
  patterns: string[];
}> = [
  { id: "receita_bruta", patterns: ["receita bruta", "faturamento bruto", "vendas brutas"] },
  { id: "deducoes", patterns: ["deducoes", "devolucoes", "impostos sobre vendas"] },
  { id: "receita_liquida", patterns: ["receita liquida", "receita liquida de vendas"] },
  { id: "cmv_cpv", patterns: ["cmv", "cpv", "custo das mercadorias", "custo dos produtos", "custo dos servicos"] },
  { id: "lucro_bruto", patterns: ["lucro bruto", "resultado bruto"] },
  { id: "despesas_operacionais", patterns: ["despesas operacionais", "opex"] },
  { id: "despesas_administrativas", patterns: ["despesas administrativas", "despesas adm"] },
  { id: "despesas_comerciais", patterns: ["despesas comerciais", "despesas com vendas"] },
  { id: "despesas_financeiras", patterns: ["despesas financeiras", "juros pagos"] },
  { id: "outras_receitas", patterns: ["outras receitas", "receitas nao operacionais"] },
  { id: "outras_despesas", patterns: ["outras despesas", "despesas nao operacionais"] },
  { id: "ebitda", patterns: ["ebitda"] },
  { id: "da", patterns: ["depreciacao", "amortizacao", "d&a", "da "] },
  { id: "ebit", patterns: ["ebit", "resultado operacional"] },
  { id: "resultado_antes_impostos", patterns: ["resultado antes dos impostos", "lair", "ebt"] },
  { id: "impostos", patterns: ["imposto de renda", "csll", "irpj", "impostos sobre o lucro"] },
  { id: "lucro_liquido", patterns: ["lucro liquido", "resultado liquido", "prejuizo liquido"] },
];

function norm(s: string): string {
  return stripDiacritics(normalizeText(s)).toLowerCase();
}

function parseAmount(raw: string | number | null | undefined): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const neg = /^\(.*\)$/.test(s) || s.startsWith("-");
  const cleaned = s.replace(/[^\d,.-]/g, "").replace(/\.(?=.*\.)/g, "").replace(",", ".");
  const n = Number(cleaned.replace(/-/g, ""));
  if (!Number.isFinite(n)) return null;
  return neg ? -Math.abs(n) : n;
}

export type DreInputLine = {
  label: string;
  amount?: string | number | null;
};

export function interpretDreLines(lines: DreInputLine[]): DreInterpretationResult {
  const interpreted: DreLineInterpretation[] = lines.map((line) => {
    const scan = scanImportedContent(line.label);
    const labelN = norm(scan.sanitizedText);
    let recognizedAs: DreLineInterpretation["recognizedAs"] = "unknown";
    let confidence = 0.15;
    const signals: string[] = [];
    if (scan.signals.length) signals.push(...scan.signals.map((s) => `injection:${s}`));

    for (const m of LABEL_MAP) {
      for (const p of m.patterns) {
        if (labelN.includes(p)) {
          recognizedAs = m.id;
          confidence = 0.92;
          signals.push(`pattern:${p}`);
          break;
        }
      }
      if (recognizedAs !== "unknown") break;
    }

    return {
      originalLabel: line.label,
      recognizedAs,
      amount: parseAmount(line.amount),
      confidence: clampConfidence(confidence),
      signals,
    };
  });

  const byId = (id: DreLineInterpretation["recognizedAs"]) =>
    interpreted.find((l) => l.recognizedAs === id)?.amount ?? null;

  const receitaBruta = byId("receita_bruta");
  const deducoes = byId("deducoes");
  const receitaLiquida = byId("receita_liquida");
  const calculatedLiquida =
    receitaBruta != null && deducoes != null ? receitaBruta - Math.abs(deducoes) : null;

  const subtotalDivergences: DreInterpretationResult["subtotalDivergences"] = [];
  if (receitaLiquida != null && calculatedLiquida != null) {
    const delta = Math.round((receitaLiquida - calculatedLiquida) * 100) / 100;
    if (Math.abs(delta) > 0.01) {
      subtotalDivergences.push({
        label: "Receita Líquida",
        reported: receitaLiquida,
        calculated: calculatedLiquida,
        delta,
      });
    }
  }

  const lucroBruto = byId("lucro_bruto");
  const cmv = byId("cmv_cpv");
  if (lucroBruto != null && receitaLiquida != null && cmv != null) {
    const calc = receitaLiquida - Math.abs(cmv);
    const delta = Math.round((lucroBruto - calc) * 100) / 100;
    if (Math.abs(delta) > 0.01) {
      subtotalDivergences.push({
        label: "Lucro Bruto",
        reported: lucroBruto,
        calculated: calc,
        delta,
      });
    }
  }

  return {
    lines: interpreted,
    subtotalDivergences,
    requiresHumanConfirmation: true,
    attribution: ATTRIBUTION,
  };
}
