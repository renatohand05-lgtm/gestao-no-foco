/**
 * Fase 25 — Inventário rotativo/geral (modelo puro).
 */

export type InventoryCycleKind = "rotativo" | "geral";

export type InventoryCycleStatus =
  | "aberto"
  | "em_conferencia"
  | "divergencias"
  | "ajustado"
  | "fechado"
  | "cancelado";

export type InventoryCountLine = {
  produtoId: string;
  saldoSistema: number;
  contagem: number | null;
};

export type InventoryDivergence = {
  produtoId: string;
  saldoSistema: number;
  contagem: number;
  divergencia: number;
};

export function computeInventoryDivergences(
  lines: InventoryCountLine[],
): InventoryDivergence[] {
  const out: InventoryDivergence[] = [];
  for (const line of lines) {
    if (line.contagem == null || !Number.isFinite(line.contagem)) continue;
    const divergencia = line.contagem - line.saldoSistema;
    if (divergencia === 0) continue;
    out.push({
      produtoId: line.produtoId,
      saldoSistema: line.saldoSistema,
      contagem: line.contagem,
      divergencia,
    });
  }
  return out;
}

export function inventoryNeedsAdjustment(
  divergences: InventoryDivergence[],
): boolean {
  return divergences.some((d) => d.divergencia !== 0);
}

export const INVENTORY_STATUS_TRANSITIONS: Record<
  InventoryCycleStatus,
  readonly InventoryCycleStatus[]
> = {
  aberto: ["em_conferencia", "cancelado"],
  em_conferencia: ["divergencias", "fechado", "cancelado"],
  divergencias: ["ajustado", "em_conferencia", "cancelado"],
  ajustado: ["fechado"],
  fechado: [],
  cancelado: [],
};

export function canTransitionInventory(
  from: InventoryCycleStatus,
  to: InventoryCycleStatus,
): boolean {
  return (INVENTORY_STATUS_TRANSITIONS[from] ?? []).includes(to);
}

export function assertInventoryTransition(
  from: InventoryCycleStatus,
  to: InventoryCycleStatus,
): void {
  if (!canTransitionInventory(from, to)) {
    throw new Error(`Transição de inventário inválida: ${from} → ${to}`);
  }
}
