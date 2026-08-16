/**
 * Contexto de mensagem da OS — só o necessário, sem valores financeiros.
 */

import { vehicleSummaryLine } from "./vehicle-line.ts";

export function osServiceSummary(
  itens: Array<{ descricao?: string | null; aprovacao_status?: string | null }>,
  segment?: string | null,
): string {
  if (segment === "lava_rapido") return "";
  const names = itens
    .filter((i) => i.aprovacao_status !== "recusado" && i.aprovacao_status !== "cancelado")
    .map((i) => (i.descricao ?? "").trim())
    .filter((name) => name && !/^(undefined|null)$/i.test(name))
    .slice(0, 3);
  if (!names.length) return "";
  return names.join(", ");
}

export function osVehicleSummary(input: {
  marca?: string | null;
  modelo?: string | null;
  placa?: string | null;
}): string {
  return vehicleSummaryLine(input);
}
