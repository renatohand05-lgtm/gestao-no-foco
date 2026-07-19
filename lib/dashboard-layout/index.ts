/**
 * Personal Dashboard Layout — Sprint 12.2 + Persistência 13.6
 * Atenção: NÃO reexportar persistence/service aqui (usa next/headers).
 */

export {
  createDefaultBlocks,
  createInitialLayoutState,
  sortBlocks,
  reindexOrders,
  applyPreset,
  moveBlock,
  moveBlockToIndex,
  setBlockVisible,
  setBlockDensity,
  cycleBlockDensity,
  toSnapshot,
  snapshotToJson,
  parseLayoutJson,
  applySnapshot,
  duplicateLayout,
  saveLayoutToMemory,
} from "@/lib/dashboard-layout/layout-engine";

export { LAYOUT_PRESETS, getLayoutPreset } from "@/lib/dashboard-layout/layout-presets";

export {
  ALL_LAYOUT_BLOCKS,
  LAYOUT_BLOCK_LABELS,
  LAYOUT_SCHEMA_VERSION,
} from "@/lib/dashboard-layout/layout-types";

export type {
  LayoutBlockId,
  LayoutDensity,
  LayoutBlockState,
  LayoutPresetId,
  DashboardLayoutSnapshot,
  LayoutEngineState,
} from "@/lib/dashboard-layout/layout-types";

export {
  computeInsertIndex,
  insertIndexToMoveTarget,
  shouldStartDrag,
  LAYOUT_DND_LONG_PRESS_MS,
} from "@/lib/dashboard-layout/layout-dnd";
