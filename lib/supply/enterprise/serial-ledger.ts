/**
 * Sprint 25.4.3 — Rastreabilidade de número de série (funções puras).
 */

export type SerialStatus =
  | "disponivel"
  | "reservado"
  | "em_uso"
  | "vendido"
  | "devolvido"
  | "avariado"
  | "bloqueado"
  | "baixado";

const ALLOWED: Record<SerialStatus, readonly SerialStatus[]> = {
  disponivel: ["reservado", "em_uso", "vendido", "avariado", "bloqueado", "baixado"],
  reservado: ["disponivel", "em_uso", "vendido", "bloqueado"],
  em_uso: ["disponivel", "vendido", "devolvido", "avariado", "baixado"],
  vendido: ["devolvido", "avariado"],
  devolvido: ["disponivel", "avariado", "baixado"],
  avariado: ["bloqueado", "baixado", "disponivel"],
  bloqueado: ["disponivel", "baixado"],
  baixado: [],
};

export function canTransitionSerial(
  from: SerialStatus,
  to: SerialStatus,
): boolean {
  if (from === to) return true;
  return (ALLOWED[from] ?? []).includes(to);
}

export function assertSerialTransition(from: SerialStatus, to: SerialStatus) {
  if (!canTransitionSerial(from, to)) {
    throw new Error(`Transição de série inválida: ${from} → ${to}.`);
  }
}

export function assertSerialUnique(input: {
  existing: Array<{ produtoId: string; numeroSerie: string; tenantId: string }>;
  tenantId: string;
  produtoId: string;
  numeroSerie: string;
}): void {
  const n = input.numeroSerie.trim().toUpperCase();
  if (!n) throw new Error("Número de série obrigatório.");
  const dup = input.existing.some(
    (e) =>
      e.tenantId === input.tenantId &&
      e.produtoId === input.produtoId &&
      e.numeroSerie.trim().toUpperCase() === n,
  );
  if (dup) {
    throw new Error("Série já existe para este produto neste tenant.");
  }
}

export function assertSerialNotDoubleSold(status: SerialStatus) {
  if (status === "vendido") {
    throw new Error("Série já vendida — não pode ser vendida novamente.");
  }
}

export function assertSerialSingleLocation(input: {
  status: SerialStatus;
  depositoId: string | null;
  targetDepositoId: string | null;
}): void {
  if (
    input.status === "vendido" ||
    input.status === "baixado" ||
    input.status === "em_uso"
  ) {
    if (
      input.depositoId &&
      input.targetDepositoId &&
      input.depositoId !== input.targetDepositoId
    ) {
      throw new Error("Série não pode estar em dois locais simultaneamente.");
    }
  }
}
