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
  custoUnitario?: number | null;
  loteId?: string | null;
  serieId?: string | null;
  justificativa?: string | null;
};

export type InventoryDivergence = {
  produtoId: string;
  saldoSistema: number;
  contagem: number;
  divergencia: number;
  custoDivergencia: number | null;
};

export function computeInventoryDivergences(
  lines: InventoryCountLine[],
): InventoryDivergence[] {
  const out: InventoryDivergence[] = [];
  for (const line of lines) {
    if (line.contagem == null || !Number.isFinite(line.contagem)) continue;
    const divergencia = line.contagem - line.saldoSistema;
    if (divergencia === 0) continue;
    const custo =
      line.custoUnitario != null && Number.isFinite(line.custoUnitario)
        ? Number((divergencia * line.custoUnitario).toFixed(4))
        : null;
    out.push({
      produtoId: line.produtoId,
      saldoSistema: line.saldoSistema,
      contagem: line.contagem,
      divergencia,
      custoDivergencia: custo,
    });
  }
  return out;
}

/** Contagem cega: saldo esperado oculto até após contagem (quando configurado). */
export function resolveDisplayedExpectedQty(input: {
  contagemCega: boolean;
  contagem: number | null;
  saldoSistema: number;
}): number | null {
  if (!input.contagemCega) return input.saldoSistema;
  if (input.contagem == null) return null;
  return input.saldoSistema;
}

/** Estoque só muda após aprovação (ajustado) — nunca na contagem. */
export function inventoryCountMutatesStock(status: InventoryCycleStatus): boolean {
  return status === "ajustado" || status === "fechado";
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
