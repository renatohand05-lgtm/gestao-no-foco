/**
 * Sprint 25.4.3 — Controle de validade e alertas.
 */

export type ValidityAlertBand =
  | "vencido"
  | "vence_7"
  | "vence_30"
  | "vence_60"
  | "vence_90"
  | "ok";

export function daysUntilExpiry(validadeIso: string, todayIso: string): number {
  const a = Date.parse(`${validadeIso}T00:00:00Z`);
  const b = Date.parse(`${todayIso}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return NaN;
  return Math.floor((a - b) / 86_400_000);
}

export function classifyValidityAlert(
  validadeIso: string | null | undefined,
  todayIso: string,
  controlaValidade: boolean,
): ValidityAlertBand | null {
  if (!controlaValidade) return null;
  if (!validadeIso) return null;
  const d = daysUntilExpiry(validadeIso, todayIso);
  if (!Number.isFinite(d)) return null;
  if (d < 0) return "vencido";
  if (d <= 7) return "vence_7";
  if (d <= 30) return "vence_30";
  if (d <= 60) return "vence_60";
  if (d <= 90) return "vence_90";
  return "ok";
}

export function assertNotExpiredForSale(input: {
  controlaValidade: boolean;
  validadeIso: string | null;
  todayIso: string;
  minShelfLifeDays?: number;
}): void {
  if (!input.controlaValidade || !input.validadeIso) return;
  const d = daysUntilExpiry(input.validadeIso, input.todayIso);
  if (d < 0) {
    throw new Error("Item vencido bloqueado para venda/uso.");
  }
  const min = input.minShelfLifeDays ?? 0;
  if (d < min) {
    throw new Error(
      `Validade insuficiente (restam ${d} dia(s); mínimo ${min}).`,
    );
  }
}
