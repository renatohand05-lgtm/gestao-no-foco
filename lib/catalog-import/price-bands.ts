/**
 * Sprint 25.3 — Faixas de preço do catálogo de serviços.
 * Premissas são DADOS (editáveis) — não hardcode no motor.
 * Defaults iniciais vêm do arquivo de catálogo (aba Premissas) ou do caller.
 */

export type PriceBandId =
  | "economico"
  | "popular"
  | "estruturado"
  | "especializado"
  | "personalizado";

export type PriceBandRates = {
  economico: number;
  popular: number;
  estruturado: number;
  especializado: number;
  personalizado?: number;
};

/** Defaults de referência do catálogo Zona Sul SP — editáveis pelo tenant. */
export const CATALOG_REFERENCE_HOUR_RATES: Readonly<PriceBandRates> = {
  economico: 110,
  popular: 145,
  estruturado: 180,
  especializado: 240,
};

export const PRICE_BAND_LABELS: Record<PriceBandId, string> = {
  economico: "Econômico",
  popular: "Popular recomendado",
  estruturado: "Estruturado",
  especializado: "Especializado",
  personalizado: "Personalizado",
};

export function resolveHourRate(
  band: PriceBandId,
  rates: PriceBandRates,
): number {
  if (band === "personalizado") {
    const custom = rates.personalizado;
    if (custom == null || !Number.isFinite(custom) || custom <= 0) {
      throw new Error(
        "Faixa personalizada exige hora técnica válida (R$/h > 0).",
      );
    }
    return custom;
  }
  const rate = rates[band];
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error(`Hora técnica inválida para faixa ${band}.`);
  }
  return rate;
}

export function computeServicePrice(input: {
  tempoPadraoH: number | null | undefined;
  band: PriceBandId;
  rates: PriceBandRates;
  explicitPrice?: number | null;
}): { price: number | null; hourRate: number | null; source: string } {
  if (
    input.explicitPrice != null &&
    Number.isFinite(input.explicitPrice) &&
    input.explicitPrice >= 0
  ) {
    return {
      price: Number(input.explicitPrice),
      hourRate: null,
      source: "preco_explicito",
    };
  }
  const hours = Number(input.tempoPadraoH);
  if (!Number.isFinite(hours) || hours <= 0) {
    return { price: null, hourRate: null, source: "tempo_ausente" };
  }
  const hourRate = resolveHourRate(input.band, input.rates);
  const price = Math.round(hours * hourRate * 100) / 100;
  return { price, hourRate, source: "hora_tecnica_x_tempo" };
}

export function estimateMargin(
  price: number | null,
  cost: number | null | undefined,
): number | null {
  if (price == null || !Number.isFinite(price) || price <= 0) return null;
  if (cost == null || !Number.isFinite(cost) || cost < 0) return null;
  return Math.round(((price - cost) / price) * 10000) / 100;
}

export function assertValidHourRates(rates: PriceBandRates, band?: PriceBandId) {
  const keys: Array<keyof PriceBandRates> = [
    "economico",
    "popular",
    "estruturado",
    "especializado",
  ];
  for (const k of keys) {
    const v = rates[k];
    if (v == null || !Number.isFinite(v) || v <= 0) {
      throw new Error(
        `Hora técnica inválida (${k}): use um valor numérico > 0 (sem NaN/Infinity).`,
      );
    }
  }
  if (band === "personalizado") {
    resolveHourRate("personalizado", rates);
  }
}

export function formatBrl(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "indisponível";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export type PriceRecalcPreview = {
  band: PriceBandId;
  hourRate: number;
  affectedCount: number;
  sampleDiffs: Array<{
    codigo: string;
    nome: string;
    priceBefore: number | null;
    priceAfter: number | null;
    diff: number | null;
  }>;
};

export function previewPriceRecalc(input: {
  band: PriceBandId;
  rates: PriceBandRates;
  rows: Array<{
    codigo: string;
    nome: string;
    tempoPadraoH: number | null;
    priceBefore: number | null;
  }>;
  sampleLimit?: number;
}): PriceRecalcPreview {
  const hourRate = resolveHourRate(input.band, input.rates);
  const sampleLimit = input.sampleLimit ?? 8;
  const sampleDiffs: PriceRecalcPreview["sampleDiffs"] = [];
  let affectedCount = 0;

  for (const row of input.rows) {
    const after = computeServicePrice({
      tempoPadraoH: row.tempoPadraoH,
      band: input.band,
      rates: input.rates,
    });
    if (after.price == null) continue;
    affectedCount += 1;
    if (sampleDiffs.length < sampleLimit) {
      const before = row.priceBefore;
      sampleDiffs.push({
        codigo: row.codigo,
        nome: row.nome,
        priceBefore: before,
        priceAfter: after.price,
        diff:
          before != null && Number.isFinite(before)
            ? Math.round((after.price - before) * 100) / 100
            : null,
      });
    }
  }

  return { band: input.band, hourRate, affectedCount, sampleDiffs };
}
