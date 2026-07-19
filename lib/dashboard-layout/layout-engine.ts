/**
 * Layout engine — estado local, presets, import/export JSON (Sprint 12.2).
 * Sem banco · sem fetch · sem alterar métricas.
 */

import { getLayoutPreset } from "@/lib/dashboard-layout/layout-presets";
import {
  ALL_LAYOUT_BLOCKS,
  LAYOUT_SCHEMA_VERSION,
  type DashboardLayoutSnapshot,
  type LayoutBlockId,
  type LayoutBlockState,
  type LayoutDensity,
  type LayoutEngineState,
  type LayoutPresetId,
} from "@/lib/dashboard-layout/layout-types";

export function createDefaultBlocks(): LayoutBlockState[] {
  return ALL_LAYOUT_BLOCKS.map((id, order) => ({
    id,
    visible: true,
    density: "normal",
    order,
  }));
}

export function createInitialLayoutState(): LayoutEngineState {
  return {
    editMode: false,
    fullscreen: false,
    compactMode: false,
    activePresetId: "custom",
    layoutName: "Meu dashboard",
    blocks: createDefaultBlocks(),
    savedLayouts: [],
  };
}

export function sortBlocks(blocks: LayoutBlockState[]): LayoutBlockState[] {
  return [...blocks].sort((a, b) => a.order - b.order);
}

export function reindexOrders(blocks: LayoutBlockState[]): LayoutBlockState[] {
  return sortBlocks(blocks).map((b, order) => ({ ...b, order }));
}

export function applyPreset(
  state: LayoutEngineState,
  presetId: LayoutPresetId,
): LayoutEngineState {
  if (presetId === "custom") return { ...state, activePresetId: "custom" };
  const preset = getLayoutPreset(presetId);
  if (!preset) return state;

  const hidden = new Set(preset.hidden ?? []);
  const blocks = preset.order.map((id, order) => {
    const prev = state.blocks.find((b) => b.id === id);
    return {
      id,
      visible: !hidden.has(id),
      density: prev?.density ?? ("normal" as LayoutDensity),
      order,
    };
  });

  return {
    ...state,
    activePresetId: presetId,
    layoutName: preset.label,
    blocks: reindexOrders(blocks),
  };
}

export function moveBlock(
  blocks: LayoutBlockState[],
  id: LayoutBlockId,
  direction: "up" | "down",
): LayoutBlockState[] {
  const sorted = sortBlocks(blocks);
  const index = sorted.findIndex((b) => b.id === id);
  if (index < 0) return blocks;
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= sorted.length) return blocks;
  const next = [...sorted];
  const tmp = next[index]!;
  next[index] = next[target]!;
  next[target] = tmp;
  return reindexOrders(next);
}

/** Arquitetura DnD: move para índice absoluto. */
export function moveBlockToIndex(
  blocks: LayoutBlockState[],
  id: LayoutBlockId,
  toIndex: number,
): LayoutBlockState[] {
  const sorted = sortBlocks(blocks);
  const from = sorted.findIndex((b) => b.id === id);
  if (from < 0) return blocks;
  const clamped = Math.max(0, Math.min(toIndex, sorted.length - 1));
  if (from === clamped) return blocks;
  const next = [...sorted];
  const [item] = next.splice(from, 1);
  next.splice(clamped, 0, item!);
  return reindexOrders(next);
}

export function setBlockVisible(
  blocks: LayoutBlockState[],
  id: LayoutBlockId,
  visible: boolean,
): LayoutBlockState[] {
  return blocks.map((b) => (b.id === id ? { ...b, visible } : b));
}

export function setBlockDensity(
  blocks: LayoutBlockState[],
  id: LayoutBlockId,
  density: LayoutDensity,
): LayoutBlockState[] {
  return blocks.map((b) => (b.id === id ? { ...b, density } : b));
}

export function cycleBlockDensity(density: LayoutDensity): LayoutDensity {
  const order: LayoutDensity[] = [
    "normal",
    "compact",
    "expandido",
    "recolhido",
  ];
  const i = order.indexOf(density);
  return order[(i + 1) % order.length]!;
}

export function toSnapshot(state: LayoutEngineState): DashboardLayoutSnapshot {
  return {
    version: LAYOUT_SCHEMA_VERSION,
    name: state.layoutName,
    presetId: state.activePresetId,
    updatedAt: "local",
    compactMode: state.compactMode,
    blocks: sortBlocks(state.blocks),
  };
}

export function snapshotToJson(snapshot: DashboardLayoutSnapshot): string {
  return JSON.stringify(snapshot, null, 2);
}

export function parseLayoutJson(raw: string): DashboardLayoutSnapshot | null {
  try {
    const data = JSON.parse(raw) as Partial<DashboardLayoutSnapshot>;
    if (data.version !== 1 || !Array.isArray(data.blocks)) return null;
    const blocks = data.blocks
      .filter(
        (b): b is LayoutBlockState =>
          !!b &&
          typeof b === "object" &&
          typeof (b as LayoutBlockState).id === "string" &&
          ALL_LAYOUT_BLOCKS.includes((b as LayoutBlockState).id),
      )
      .map((b, order) => ({
        id: b.id,
        visible: Boolean(b.visible),
        density: (b.density ?? "normal") as LayoutDensity,
        order: typeof b.order === "number" ? b.order : order,
      }));

    // Completa blocos faltantes
    const missing = ALL_LAYOUT_BLOCKS.filter(
      (id) => !blocks.some((b) => b.id === id),
    ).map((id, i) => ({
      id,
      visible: true,
      density: "normal" as LayoutDensity,
      order: blocks.length + i,
    }));

    return {
      version: 1,
      name: typeof data.name === "string" ? data.name : "Layout importado",
      presetId: (data.presetId as LayoutPresetId) ?? "custom",
      updatedAt:
        typeof data.updatedAt === "string" ? data.updatedAt : "local",
      compactMode: Boolean(data.compactMode),
      blocks: reindexOrders([...blocks, ...missing]),
    };
  } catch {
    return null;
  }
}

export function applySnapshot(
  state: LayoutEngineState,
  snapshot: DashboardLayoutSnapshot,
): LayoutEngineState {
  return {
    ...state,
    layoutName: snapshot.name,
    activePresetId: snapshot.presetId,
    compactMode: snapshot.compactMode,
    blocks: reindexOrders(snapshot.blocks),
  };
}

export function duplicateLayout(
  state: LayoutEngineState,
): LayoutEngineState {
  const snap = toSnapshot({
    ...state,
    layoutName: `${state.layoutName} (cópia)`,
    activePresetId: "custom",
  });
  return {
    ...state,
    layoutName: snap.name,
    activePresetId: "custom",
    savedLayouts: [...state.savedLayouts, snap],
  };
}

export function saveLayoutToMemory(
  state: LayoutEngineState,
): LayoutEngineState {
  const snap = toSnapshot(state);
  const others = state.savedLayouts.filter((s) => s.name !== snap.name);
  return {
    ...state,
    savedLayouts: [...others, snap],
  };
}
