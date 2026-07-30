/**
 * Sprint 22.7 — Detecção de tipo de documento (nome, cabeçalhos, palavras-chave).
 */

import { stripDiacritics, normalizeText } from "../parsers/normalize.ts";
import { confidenceBand, clampConfidence } from "./confidence.ts";
import { scanImportedContent } from "./prompt-injection.ts";
import type { DocumentDetectionResult, DocumentKind } from "./types.ts";

const ATTRIBUTION =
  "Sugestão baseada em regras e histórico do tenant.";

type KindSignals = {
  kind: DocumentKind;
  keywords: string[];
  headers: string[];
  fileNameHints: string[];
};

const KIND_DEFS: KindSignals[] = [
  {
    kind: "dre",
    keywords: [
      "receita bruta",
      "receita liquida",
      "lucro liquido",
      "ebitda",
      "cmv",
      "cpv",
      "despesas operacionais",
      "resultado antes",
    ],
    headers: ["conta", "grupo", "valor", "periodo"],
    fileNameHints: ["dre", "resultado", "demonstrativo"],
  },
  {
    kind: "bank_statement",
    keywords: ["saldo", "debito", "credito", "extrato", "lancamento", "banco"],
    headers: ["data", "historico", "valor", "saldo", "debito", "credito"],
    fileNameHints: ["extrato", "ofx", "statement", "banco"],
  },
  {
    kind: "accounts_payable",
    keywords: ["contas a pagar", "fornecedor", "vencimento", "apag"],
    headers: ["fornecedor", "vencimento", "valor", "documento"],
    fileNameHints: ["pagar", "ap", "fornecedor"],
  },
  {
    kind: "accounts_receivable",
    keywords: ["contas a receber", "cliente", "recebimento"],
    headers: ["cliente", "vencimento", "valor", "documento"],
    fileNameHints: ["receber", "ar", "cliente"],
  },
  {
    kind: "payroll",
    keywords: ["folha", "inss", "fgts", "pro-labore", "pro labore", "liquido", "bruto", "colaborador"],
    headers: ["colaborador", "funcionario", "cargo", "salario", "liquido", "bruto", "inss", "fgts"],
    fileNameHints: ["folha", "payroll", "pessoal"],
  },
  {
    kind: "trial_balance",
    keywords: ["balancete", "debito", "credito", "saldo final", "conta contabil"],
    headers: ["conta", "debito", "credito", "saldo"],
    fileNameHints: ["balancete", "trial"],
  },
  {
    kind: "cash_flow",
    keywords: ["fluxo de caixa", "entradas", "saidas", "saldo operacional"],
    headers: ["entrada", "saida", "fluxo", "periodo"],
    fileNameHints: ["fluxo", "cashflow", "caixa"],
  },
  {
    kind: "sales",
    keywords: ["venda", "faturamento", "sku", "pedido"],
    headers: ["produto", "quantidade", "valor", "cliente", "pedido"],
    fileNameHints: ["vendas", "sales", "faturamento"],
  },
  {
    kind: "service_orders",
    keywords: ["ordem de servico", "os ", "oficina", "placa"],
    headers: ["os", "placa", "servico", "mecanico", "status"],
    fileNameHints: ["ordens", "os-", "oficina"],
  },
];

function norm(s: string): string {
  return stripDiacritics(normalizeText(s)).toLowerCase();
}

export type DetectDocumentInput = {
  fileName?: string;
  headers?: string[];
  sampleText?: string;
  extension?: string;
};

export function detectDocumentKind(input: DetectDocumentInput): DocumentDetectionResult {
  const scan = scanImportedContent(
    [input.fileName, ...(input.headers ?? []), input.sampleText ?? ""].join("\n"),
  );
  const fileName = norm(input.fileName ?? "");
  const headers = (input.headers ?? []).map(norm);
  const body = norm(scan.sanitizedText);
  const ext = (input.extension ?? "").toLowerCase();

  const scored = KIND_DEFS.map((def) => {
    const signals: string[] = [];
    let score = 0;

    for (const hint of def.fileNameHints) {
      if (fileName.includes(hint)) {
        score += 0.22;
        signals.push(`filename:${hint}`);
      }
    }
    for (const h of def.headers) {
      if (headers.some((x) => x.includes(h) || h.includes(x))) {
        score += 0.12;
        signals.push(`header:${h}`);
      }
    }
    for (const kw of def.keywords) {
      if (body.includes(kw)) {
        score += 0.1;
        signals.push(`keyword:${kw}`);
      }
    }
    if (ext === ".ofx" && def.kind === "bank_statement") {
      score += 0.35;
      signals.push("extension:ofx");
    }
    if (scan.signals.length && def.kind !== "unknown") {
      // injection noise não eleva confiança de tipo
      score *= 0.85;
      signals.push(...scan.signals.map((s) => `injection_signal:${s}`));
    }
    return {
      kind: def.kind,
      confidence: clampConfidence(score),
      signals,
      reason: signals.slice(0, 4).join(", ") || "sem sinais",
    };
  }).sort((a, b) => b.confidence - a.confidence);

  const top = scored[0];
  const suggestedKind: DocumentKind =
    top && top.confidence >= 0.25 ? top.kind : "unknown";
  const confidence =
    suggestedKind === "unknown" ? clampConfidence(top?.confidence ?? 0) : top.confidence;
  const alternatives = scored
    .filter((s) => s.kind !== suggestedKind && s.confidence >= 0.2)
    .slice(0, 3)
    .map((s) => ({ kind: s.kind, confidence: s.confidence, reason: s.reason }));

  return {
    suggestedKind,
    confidence,
    band: confidenceBand(confidence),
    signals: top?.signals ?? [],
    alternatives,
    requiresConfirmation: confidence < 0.85 || suggestedKind === "unknown",
    attribution: ATTRIBUTION,
  };
}
