/**
 * Sprint 35.2.2 — linha de veículo segura para templates.
 */

export function vehicleSummaryLine(input: {
  marca?: string | null;
  modelo?: string | null;
  placa?: string | null;
}): string {
  const marca = safe(input.marca);
  const modelo = safe(input.modelo);
  const placa = safe(input.placa);
  const name = [marca, modelo].filter(Boolean).join(" ").trim();
  if (!name && !placa) return "";
  if (name && placa) return `Veículo: ${name} · ${placa}`;
  if (name) return `Veículo: ${name}`;
  return `Veículo: ${placa}`;
}

function safe(value?: string | null): string {
  if (value == null) return "";
  const trimmed = String(value).trim();
  if (!trimmed) return "";
  if (/^(undefined|null|n\/a)$/i.test(trimmed)) return "";
  return trimmed;
}
