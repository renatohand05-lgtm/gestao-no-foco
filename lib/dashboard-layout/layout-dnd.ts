/**
 * Helpers puros do Drag & Drop do Workspace Editor (Sprint 13.7).
 * Sem I/O · sem React · sem persistência.
 */

export type InsertIndexResult = {
  /** Índice de inserção na lista (0…length). */
  insertIndex: number;
};

/**
 * Calcula índice de inserção a partir da posição Y do ponteiro
 * e dos retângulos dos itens (ordem visual).
 */
export function computeInsertIndex(
  clientY: number,
  itemRects: Array<{ top: number; height: number }>,
): InsertIndexResult {
  if (itemRects.length === 0) return { insertIndex: 0 };

  for (let i = 0; i < itemRects.length; i++) {
    const rect = itemRects[i]!;
    const mid = rect.top + rect.height / 2;
    if (clientY < mid) return { insertIndex: i };
  }
  return { insertIndex: itemRects.length };
}

/**
 * Converte índice de inserção (com “slot” após remoção) no índice final
 * para `moveTo`, quando o item sai da posição `fromIndex`.
 */
export function insertIndexToMoveTarget(
  fromIndex: number,
  insertIndex: number,
  length: number,
): number {
  let target = insertIndex;
  if (fromIndex < target) target -= 1;
  return Math.max(0, Math.min(target, length - 1));
}

export function shouldStartDrag(
  pointerType: string,
  movedPx: number,
  longPressElapsed: boolean,
  moveThresholdPx = 6,
): boolean {
  if (pointerType === "touch" || pointerType === "pen") {
    return longPressElapsed;
  }
  return movedPx >= moveThresholdPx;
}

export const LAYOUT_DND_LONG_PRESS_MS = 380;
export const LAYOUT_DND_EDGE_SCROLL_PX = 56;
export const LAYOUT_DND_SCROLL_SPEED = 14;
