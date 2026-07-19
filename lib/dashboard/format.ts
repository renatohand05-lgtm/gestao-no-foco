/**
 * Formatadores do Dashboard.
 * Núcleo compartilhado em `@/lib/format` — wrappers locais só para helpers de UI.
 */

export {
  formatCurrency,
  formatNumber,
  formatPercent,
  formatVariationPct,
} from "@/lib/format";

export function getGreeting(name?: string | null) {
  const hour = new Date().getHours();
  const period =
    hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  return name ? `${period}, ${name.split(" ")[0]}` : period;
}

export function getCurrentMonthLabel() {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(new Date());
}
