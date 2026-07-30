/**
 * Sprint 25.4.3 — Transformações de mapeamento (datas, moeda, qty BR).
 */

export function parseBrazilianNumber(raw: unknown): number | null {
  if (raw == null || raw === "") return null;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  let s = String(raw).trim();
  if (!s) return null;
  s = s.replace(/[R$\s]/g, "");
  if (s.includes(",") && s.includes(".")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (s.includes(",")) {
    s = s.replace(",", ".");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function parseFlexibleDateBr(raw: unknown): string | null {
  if (raw == null || raw === "") return null;
  const s = String(raw).trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const br = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (br) {
    const d = br[1]!.padStart(2, "0");
    const m = br[2]!.padStart(2, "0");
    let y = br[3]!;
    if (y.length === 2) y = `20${y}`;
    return `${y}-${m}-${d}`;
  }
  return null;
}

export function normalizeUnit(raw: unknown): string {
  const s = String(raw ?? "UN").trim().toUpperCase();
  if (!s) return "UN";
  if (["UN", "UNID", "UNIDADE", "PC", "PÇ"].includes(s)) return "UN";
  return s.slice(0, 10);
}

export type StockMappingTransformProfile = {
  decimalSeparator: "," | ".";
  thousandSeparator: "." | "," | "";
  dateFormat: "br" | "iso";
  currencyLocale: "pt-BR";
};

export const DEFAULT_STOCK_TRANSFORM: StockMappingTransformProfile = {
  decimalSeparator: ",",
  thousandSeparator: ".",
  dateFormat: "br",
  currencyLocale: "pt-BR",
};

export function applyStockFieldTransform(
  fieldKey: string,
  value: unknown,
  profile: StockMappingTransformProfile = DEFAULT_STOCK_TRANSFORM,
): unknown {
  void profile;
  if (
    [
      "quantidade_atual",
      "custo_medio",
      "custo_reposicao",
      "preco_venda",
      "preco_minimo",
      "estoque_minimo",
      "estoque_maximo",
      "estoque_seguranca",
      "margem_alvo",
    ].includes(fieldKey)
  ) {
    return parseBrazilianNumber(value);
  }
  if (["validade", "fabricacao"].includes(fieldKey)) {
    return parseFlexibleDateBr(value);
  }
  if (fieldKey === "unidade") return normalizeUnit(value);
  return value;
}
