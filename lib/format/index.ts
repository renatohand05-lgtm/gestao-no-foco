/**
 * Formatadores compartilhados (Sprint 9.8.1).
 *
 * Preferir importar daqui em código novo.
 * Módulos de domínio reexportam aliases para não quebrar imports existentes.
 */

export { formatCurrency } from "@/lib/format/currency";
export { formatNumber } from "@/lib/format/number";
export {
  formatPercent,
  formatPercentTaxa,
} from "@/lib/format/percent";
export { formatQuantity } from "@/lib/format/quantity";
export { formatDateTime, formatDateOnly } from "@/lib/format/date";
export { formatVariationPct } from "@/lib/format/variation";
