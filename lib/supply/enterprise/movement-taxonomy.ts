/**
 * Fase 25 — Taxonomia de movimentações de estoque.
 * Tipos legados (`entrada`|`saida`|`ajuste`) permanecem canônicos no DB atual;
 * tipos enterprise mapeiam para efeito de saldo até migration expandir o check.
 */

import type { MovementKind } from "./types.ts";

export const LEGACY_MOVEMENT_TYPES = ["entrada", "saida", "ajuste"] as const;

export const ENTERPRISE_MOVEMENT_KINDS: readonly MovementKind[] = [
  "entrada",
  "saida",
  "transferencia",
  "ajuste",
  "inventario",
  "perda",
  "devolucao",
  "consumo_interno",
  "reserva",
  "separacao",
  "expedicao",
  "liberacao_reserva",
] as const;

export const MOVEMENT_KIND_LABELS: Record<MovementKind, string> = {
  entrada: "Entrada",
  saida: "Saída",
  transferencia: "Transferência",
  ajuste: "Ajuste",
  inventario: "Inventário",
  perda: "Perda",
  devolucao: "Devolução",
  consumo_interno: "Consumo interno",
  reserva: "Reserva",
  separacao: "Separação",
  expedicao: "Expedição",
  liberacao_reserva: "Liberação de reserva",
};

/** Efeito no saldo físico disponível (positivo = aumenta). */
export function movementBalanceDelta(
  kind: MovementKind,
  quantidade: number,
): number {
  const q = Math.abs(quantidade);
  switch (kind) {
    case "entrada":
    case "devolucao":
      return q;
    case "saida":
    case "perda":
    case "consumo_interno":
    case "expedicao":
      return -q;
    case "ajuste":
    case "inventario":
      return quantidade; // pode ser +/- conforme contagem
    case "transferencia":
      return 0; // origem -q / destino +q em dois lançamentos
    case "reserva":
    case "separacao":
    case "liberacao_reserva":
      return 0; // não altera saldo físico até expedição/saída
    default:
      return 0;
  }
}

/** Mapeia kind enterprise → tipo persistível no schema legado. */
export function toLegacyMovementType(
  kind: MovementKind,
): "entrada" | "saida" | "ajuste" {
  const delta = movementBalanceDelta(kind, 1);
  if (kind === "ajuste" || kind === "inventario") return "ajuste";
  if (delta > 0) return "entrada";
  if (delta < 0) return "saida";
  return "ajuste";
}

export function isAuditableMovement(kind: MovementKind): boolean {
  return ENTERPRISE_MOVEMENT_KINDS.includes(kind);
}

export function assertMovementKind(raw: string): MovementKind {
  if ((ENTERPRISE_MOVEMENT_KINDS as readonly string[]).includes(raw)) {
    return raw as MovementKind;
  }
  throw new Error(`Tipo de movimentação inválido: ${raw}`);
}
