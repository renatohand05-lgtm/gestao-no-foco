import { formatPercent } from "./percent";

/** Variação percentual com sinal (Dashboard). */

export function formatVariationPct(value: number | null) {
  if (value === null) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatPercent(value)}`;
}
