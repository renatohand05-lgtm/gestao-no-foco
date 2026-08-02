/**
 * Sprint 30.1 — Rótulos executivos para Analytics (UI).
 * Detalhes técnicos ficam em disclosure / title, não na face.
 */

const SOURCE_FRIENDLY: Record<string, string> = {
  "lib/financeiro/dre-service": "Financeiro — DRE",
  "lib/financeiro/dre-service + financial-intelligence": "Financeiro — DRE",
  "lib/finance/cash-intelligence": "Financeiro — Caixa",
  "lib/finance/cash-intelligence | lib/financeiro/fluxo-caixa-service":
    "Financeiro — Caixa",
  "lib/finance/cash-intelligence snapshot": "Financeiro — Caixa",
  "lib/finance/tax-intelligence": "Tributário",
  "lib/financeiro/fluxo-caixa-service": "Financeiro — Fluxo de caixa",
};

const STATUS_FRIENDLY: Record<string, string> = {
  ok: "Disponível",
  empty: "Sem dados no período",
  error: "Indisponível",
  partial: "Parcial",
  unavailable: "Indisponível",
  "source empty": "Sem dados disponíveis para o período",
};

const CONFIDENCE_FRIENDLY: Record<string, string> = {
  high: "Confiança alta",
  medium: "Confiança moderada",
  low: "Confiança baixa",
  none: "Sem confiança calculada",
};

export function friendlyAnalyticsSource(source: string | null | undefined): string {
  if (!source) return "Fonte não informada";
  if (SOURCE_FRIENDLY[source]) return SOURCE_FRIENDLY[source]!;
  // paths genéricos
  if (/cash-intelligence/i.test(source)) return "Financeiro — Caixa";
  if (/dre/i.test(source)) return "Financeiro — DRE";
  if (/tax/i.test(source)) return "Tributário";
  if (/venda|sales|crm/i.test(source)) return "Comercial";
  if (/estoque|inventory/i.test(source)) return "Estoque";
  if (source.startsWith("lib/")) {
    const tail = source.replace(/^lib\//, "").split(/[|/]/)[0] ?? source;
    return tail
      .split(/[/_-]/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }
  return source;
}

export function friendlyAnalyticsStatus(status: string | null | undefined): string {
  if (!status) return "Desconhecido";
  const key = status.toLowerCase().trim();
  return STATUS_FRIENDLY[key] ?? status;
}

export function friendlyAnalyticsConfidence(
  confidence: string | null | undefined,
): string {
  if (!confidence) return "Confiança não informada";
  const key = confidence.toLowerCase().trim();
  return CONFIDENCE_FRIENDLY[key] ?? `Confiança ${confidence}`;
}

export function friendlyAnalyticsMessage(message: string | null | undefined): string {
  if (!message) return "";
  const m = message.trim();
  if (/source empty/i.test(m)) return "Sem dados disponíveis para o período";
  if (/não está no catálogo/i.test(m)) return "Métrica ainda não disponível neste painel";
  if (/Fonte ausente/i.test(m)) return "Fonte de dados não configurada";
  if (/lib\//i.test(m)) {
    return m.replace(/lib\/[\w\-/.| +]+/g, (s) => friendlyAnalyticsSource(s.trim()));
  }
  return m;
}
