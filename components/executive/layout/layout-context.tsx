"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  applyPreset,
  applySnapshot,
  createInitialLayoutState,
  cycleBlockDensity,
  moveBlock,
  moveBlockToIndex,
  parseLayoutJson,
  setBlockDensity,
  setBlockVisible,
  snapshotToJson,
  sortBlocks,
  toSnapshot,
} from "@/lib/dashboard-layout";
import type {
  DashboardLayoutSnapshot,
  LayoutBlockId,
  LayoutDensity,
  LayoutEngineState,
  LayoutPresetId,
} from "@/lib/dashboard-layout";
import {
  deleteDashboardLayoutAction,
  duplicateDashboardLayoutAction,
  importDashboardLayoutAction,
  listDashboardLayoutsAction,
  loadDashboardLayoutAction,
  renameDashboardLayoutAction,
  restoreDashboardPresetAction,
  saveDashboardLayoutAction,
  setDefaultDashboardLayoutAction,
} from "@/lib/dashboard-layout/actions";
import type {
  BootstrapLayoutResult,
  DashboardLayoutSummary,
  LayoutDensityProfile,
} from "@/lib/dashboard-layout/persistence/types";
import type { StudioView } from "@/components/executive/layout/layout-ui";

export type PersistStatus =
  | "idle"
  | "dirty"
  | "saving"
  | "saved"
  | "synced"
  | "error"
  | "conflict"
  | "restored"
  | "deleted";

type LayoutContextValue = {
  state: LayoutEngineState;
  densityProfile: LayoutDensityProfile;
  studioView: StudioView;
  presetLastUsed: Partial<Record<LayoutPresetId, string>>;
  showStudioChrome: boolean;
  orderedVisibleIds: LayoutBlockId[];
  getDensity: (id: LayoutBlockId) => LayoutDensity;
  isVisible: (id: LayoutBlockId) => boolean;
  toggleEditMode: () => void;
  setEditMode: (v: boolean) => void;
  setStudioView: (v: StudioView) => void;
  toggleFullscreen: () => void;
  toggleCompactMode: () => void;
  cycleDensityProfile: () => void;
  applyPresetId: (id: LayoutPresetId) => void;
  move: (id: LayoutBlockId, direction: "up" | "down") => void;
  moveTo: (id: LayoutBlockId, index: number) => void;
  toggleVisible: (id: LayoutBlockId) => void;
  cycleDensity: (id: LayoutBlockId) => void;
  setDensity: (id: LayoutBlockId, density: LayoutDensity) => void;
  resetLayout: () => void;
  saveLayout: (opts?: {
    name?: string;
    asDefault?: boolean;
    asNew?: boolean;
  }) => Promise<boolean>;
  duplicate: () => Promise<boolean>;
  exportJson: () => string;
  importJson: (raw: string) => Promise<boolean>;
  rename: (name: string) => void;
  tenantSlug: string | null;
  activeLayoutId: string | null;
  layoutVersion: number | null;
  layoutSummaries: DashboardLayoutSummary[];
  persistStatus: PersistStatus;
  persistMessage: string | null;
  isDirty: boolean;
  discardChanges: () => void;
  selectPersistedLayout: (id: string) => Promise<boolean>;
  setDefaultPersistedLayout: (id: string) => Promise<boolean>;
  deletePersistedLayout: (id: string) => Promise<boolean>;
  renamePersistedLayout: (id: string, name: string) => Promise<boolean>;
  restorePresetRemote: (presetKey: LayoutPresetId) => Promise<boolean>;
  refreshLayoutList: () => Promise<void>;
  pendingPresetConfirm: LayoutPresetId | null;
  confirmPendingPreset: () => void;
  cancelPendingPreset: () => void;
};

const LayoutContext = createContext<LayoutContextValue | null>(null);

function fingerprint(state: LayoutEngineState, density: LayoutDensityProfile) {
  return JSON.stringify({
    ...toSnapshot(state),
    densityProfile: density,
  });
}

function stateFromBootstrap(bootstrap: BootstrapLayoutResult | null): {
  state: LayoutEngineState;
  density: LayoutDensityProfile;
  layoutId: string | null;
  version: number | null;
} {
  if (!bootstrap) {
    const state = applyPreset(createInitialLayoutState(), "ceo");
    return { state, density: "comfortable", layoutId: null, version: null };
  }
  const state = applySnapshot(createInitialLayoutState(), bootstrap.snapshot);
  return {
    state: {
      ...state,
      editMode: false,
      fullscreen: false,
      savedLayouts: [],
    },
    density: bootstrap.densityProfile,
    layoutId: bootstrap.record?.id ?? null,
    version: bootstrap.record?.version ?? null,
  };
}

type ProviderProps = {
  children: ReactNode;
  tenantSlug?: string | null;
  bootstrap?: BootstrapLayoutResult | null;
};

export function LayoutProvider({
  children,
  tenantSlug = null,
  bootstrap = null,
}: ProviderProps) {
  const initial = stateFromBootstrap(bootstrap);
  const [state, setState] = useState<LayoutEngineState>(initial.state);
  const [densityProfile, setDensityProfile] = useState<LayoutDensityProfile>(
    initial.density,
  );
  const [studioView, setStudioViewState] = useState<StudioView>("published");
  const [presetLastUsed, setPresetLastUsed] = useState<
    Partial<Record<LayoutPresetId, string>>
  >({});
  const [activeLayoutId, setActiveLayoutId] = useState<string | null>(
    initial.layoutId,
  );
  const [layoutVersion, setLayoutVersion] = useState<number | null>(
    initial.version,
  );
  const [layoutSummaries, setLayoutSummaries] = useState<
    DashboardLayoutSummary[]
  >(bootstrap?.summaries ?? []);
  const [persistStatus, setPersistStatus] = useState<PersistStatus>(
    bootstrap?.source === "persisted" ? "synced" : "idle",
  );
  const [persistMessage, setPersistMessage] = useState<string | null>(null);
  const [pendingPresetConfirm, setPendingPresetConfirm] =
    useState<LayoutPresetId | null>(null);
  const [baselineFp, setBaselineFp] = useState(() =>
    fingerprint(initial.state, initial.density),
  );

  const isDirty = fingerprint(state, densityProfile) !== baselineFp;
  const displayStatus: PersistStatus =
    persistStatus === "saving" ||
    persistStatus === "error" ||
    persistStatus === "conflict" ||
    persistStatus === "saved" ||
    persistStatus === "restored" ||
    persistStatus === "deleted"
      ? persistStatus
      : isDirty
        ? "dirty"
        : persistStatus;

  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  const showStudioChrome = state.editMode && studioView === "edit";
  const orderedVisibleIds = sortBlocks(state.blocks)
    .filter((b) => b.visible)
    .map((b) => b.id);

  function getDensity(id: LayoutBlockId): LayoutDensity {
    const global: LayoutDensity =
      densityProfile === "compact" || state.compactMode ? "compact" : "normal";
    const block = state.blocks.find((b) => b.id === id);
    if (!block) return global;
    if (global === "compact" && block.density === "normal") return "compact";
    return block.density;
  }

  function isVisible(id: LayoutBlockId) {
    return state.blocks.find((b) => b.id === id)?.visible ?? true;
  }

  function setStudioView(v: StudioView) {
    setStudioViewState(v);
    setState((s) => ({ ...s, editMode: v !== "published" }));
  }

  function applyPresetNow(id: LayoutPresetId) {
    setPresetLastUsed((prev) => ({
      ...prev,
      [id]: new Date().toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      }),
    }));
    setState((s) => applyPreset(s, id));
  }

  async function refreshLayoutList() {
    if (!tenantSlug) return;
    const res = await listDashboardLayoutsAction(tenantSlug);
    if (res.success) setLayoutSummaries(res.items);
  }

  async function saveLayout(opts?: {
    name?: string;
    asDefault?: boolean;
    asNew?: boolean;
  }) {
    if (!tenantSlug) {
      setPersistStatus("error");
      setPersistMessage("Tenant não disponível.");
      return false;
    }
    setPersistStatus("saving");
    setPersistMessage(null);
    const snap = toSnapshot({
      ...state,
      layoutName: opts?.name?.trim() || state.layoutName,
    });
    const layoutId = opts?.asNew ? undefined : (activeLayoutId ?? undefined);
    const res = await saveDashboardLayoutAction(tenantSlug, {
      id: layoutId,
      name: snap.name,
      presetKey: snap.presetId,
      layoutData: {
        ...snap,
        updatedAt: new Date().toISOString(),
        densityProfile,
      },
      density: densityProfile,
      isDefault: opts?.asDefault ?? false,
      expectedVersion: layoutId ? (layoutVersion ?? undefined) : undefined,
    });

    if (!res.success) {
      setPersistStatus(
        res.error.includes("Conflito de versão") ? "conflict" : "error",
      );
      setPersistMessage(res.error);
      return false;
    }

    const nextState = { ...state, layoutName: snap.name };
    setState(nextState);
    setActiveLayoutId(res.id ?? activeLayoutId);
    setBaselineFp(fingerprint(nextState, densityProfile));
    setPersistStatus("saved");
    setPersistMessage("Layout salvo.");
    await refreshLayoutList();
    if (res.id) {
      const loaded = await loadDashboardLayoutAction(tenantSlug, res.id);
      if (loaded.success && loaded.record) {
        setLayoutVersion(loaded.record.version);
      }
    }
    window.setTimeout(() => setPersistStatus("synced"), 1600);
    return true;
  }

  function discardChanges() {
    const boot = stateFromBootstrap(bootstrap);
    setState(boot.state);
    setDensityProfile(boot.density);
    setActiveLayoutId(boot.layoutId);
    setLayoutVersion(boot.version);
    setBaselineFp(fingerprint(boot.state, boot.density));
    setPersistStatus("restored");
    setPersistMessage("Alterações descartadas.");
    window.setTimeout(() => setPersistStatus("synced"), 1200);
  }

  async function duplicate() {
    if (!tenantSlug || !activeLayoutId) {
      const name = `${state.layoutName} (cópia)`;
      setState((s) => ({ ...s, layoutName: name, activePresetId: "custom" }));
      return saveLayout({ name, asDefault: false, asNew: true });
    }
    setPersistStatus("saving");
    const res = await duplicateDashboardLayoutAction(tenantSlug, activeLayoutId);
    if (!res.success) {
      setPersistStatus("error");
      setPersistMessage(res.error);
      return false;
    }
    await refreshLayoutList();
    if (res.id) await selectPersistedLayout(res.id, true);
    setPersistStatus("saved");
    setPersistMessage("Layout duplicado.");
    return true;
  }

  async function importJson(raw: string) {
    const local = parseLayoutJson(raw);
    if (!local) {
      setPersistStatus("error");
      setPersistMessage("JSON inválido.");
      return false;
    }
    if (!tenantSlug) {
      setState((s) => applySnapshot(s, local));
      return true;
    }
    setPersistStatus("saving");
    const res = await importDashboardLayoutAction(tenantSlug, raw);
    if (!res.success) {
      setPersistStatus("error");
      setPersistMessage(res.error);
      return false;
    }
    if (res.id) await selectPersistedLayout(res.id, true);
    await refreshLayoutList();
    setPersistStatus("saved");
    setPersistMessage("Layout importado.");
    return true;
  }

  async function selectPersistedLayout(id: string, bypassDirty = false) {
    if (!tenantSlug) return false;
    if (isDirty && !bypassDirty) {
      setPersistMessage("Salve ou descarte as alterações antes de trocar.");
      setPersistStatus("error");
      return false;
    }
    const loaded = await loadDashboardLayoutAction(tenantSlug, id);
    if (!loaded.success || !loaded.record) {
      setPersistStatus("error");
      setPersistMessage(loaded.success ? "Layout inválido." : loaded.error);
      return false;
    }
    const next = applySnapshot(
      createInitialLayoutState(),
      loaded.record.layout_data,
    );
    const dens =
      loaded.record.density ??
      loaded.record.layout_data.densityProfile ??
      "comfortable";
    const merged = {
      ...next,
      editMode: state.editMode,
      fullscreen: state.fullscreen,
    };
    setState(merged);
    setDensityProfile(dens);
    setActiveLayoutId(loaded.record.id);
    setLayoutVersion(loaded.record.version);
    setBaselineFp(fingerprint(merged, dens));
    setPersistStatus("synced");
    setPersistMessage(null);
    return true;
  }

  async function setDefaultPersistedLayout(id: string) {
    if (!tenantSlug) return false;
    const res = await setDefaultDashboardLayoutAction(tenantSlug, id);
    if (!res.success) {
      setPersistStatus("error");
      setPersistMessage(res.error);
      return false;
    }
    await refreshLayoutList();
    setPersistStatus("saved");
    setPersistMessage("Definido como padrão.");
    return true;
  }

  async function deletePersistedLayout(id: string) {
    if (!tenantSlug) return false;
    const res = await deleteDashboardLayoutAction(tenantSlug, id);
    if (!res.success) {
      setPersistStatus("error");
      setPersistMessage(res.error);
      return false;
    }
    if (activeLayoutId === id) discardChanges();
    await refreshLayoutList();
    setPersistStatus("deleted");
    setPersistMessage("Layout excluído.");
    return true;
  }

  async function renamePersistedLayout(id: string, name: string) {
    if (!tenantSlug) return false;
    const res = await renameDashboardLayoutAction(tenantSlug, id, name);
    if (!res.success) {
      setPersistStatus("error");
      setPersistMessage(res.error);
      return false;
    }
    if (activeLayoutId === id) {
      setState((s) => ({ ...s, layoutName: name }));
    }
    await refreshLayoutList();
    return true;
  }

  async function restorePresetRemote(presetKey: LayoutPresetId) {
    if (!tenantSlug) {
      applyPresetNow(presetKey);
      return true;
    }
    setPersistStatus("saving");
    const res = await restoreDashboardPresetAction(tenantSlug, presetKey);
    if (!res.success) {
      setPersistStatus("error");
      setPersistMessage(res.error);
      return false;
    }
    if (res.id) await selectPersistedLayout(res.id, true);
    await refreshLayoutList();
    setPersistStatus("restored");
    setPersistMessage("Preset restaurado e salvo.");
    return true;
  }

  const value: LayoutContextValue = {
    state,
    densityProfile,
    studioView,
    presetLastUsed,
    showStudioChrome,
    orderedVisibleIds,
    getDensity,
    isVisible,
    toggleEditMode: () => {
      setState((s) => {
        const next = !s.editMode;
        setStudioViewState(next ? "edit" : "published");
        return { ...s, editMode: next };
      });
    },
    setEditMode: (v) => {
      setState((s) => ({ ...s, editMode: v }));
      setStudioViewState(v ? "edit" : "published");
    },
    setStudioView,
    toggleFullscreen: () =>
      setState((s) => ({ ...s, fullscreen: !s.fullscreen })),
    toggleCompactMode: () => {
      setDensityProfile((p) => (p === "compact" ? "comfortable" : "compact"));
      setState((s) => ({ ...s, compactMode: !s.compactMode }));
    },
    cycleDensityProfile: () => {
      setDensityProfile((p) => {
        const next =
          p === "executive"
            ? "comfortable"
            : p === "comfortable"
              ? "compact"
              : "executive";
        setState((s) => ({ ...s, compactMode: next === "compact" }));
        return next;
      });
    },
    applyPresetId: (id) => {
      if (isDirty) {
        setPendingPresetConfirm(id);
        return;
      }
      applyPresetNow(id);
    },
    move: (id, direction) =>
      setState((s) => ({
        ...s,
        activePresetId: "custom",
        blocks: moveBlock(s.blocks, id, direction),
      })),
    moveTo: (id, index) =>
      setState((s) => ({
        ...s,
        activePresetId: "custom",
        blocks: moveBlockToIndex(s.blocks, id, index),
      })),
    toggleVisible: (id) =>
      setState((s) => {
        const current = s.blocks.find((b) => b.id === id)?.visible ?? true;
        return {
          ...s,
          activePresetId: "custom",
          blocks: setBlockVisible(s.blocks, id, !current),
        };
      }),
    cycleDensity: (id) =>
      setState((s) => {
        const current = s.blocks.find((b) => b.id === id)?.density ?? "normal";
        return {
          ...s,
          activePresetId: "custom",
          blocks: setBlockDensity(s.blocks, id, cycleBlockDensity(current)),
        };
      }),
    setDensity: (id, density) =>
      setState((s) => ({
        ...s,
        activePresetId: "custom",
        blocks: setBlockDensity(s.blocks, id, density),
      })),
    resetLayout: () => {
      void restorePresetRemote("ceo");
    },
    saveLayout,
    duplicate,
    exportJson: () =>
      snapshotToJson({
        ...toSnapshot(state),
        updatedAt: new Date().toISOString(),
      }),
    importJson,
    rename: (name) =>
      setState((s) => ({
        ...s,
        layoutName: name,
        activePresetId: "custom",
      })),
    tenantSlug,
    activeLayoutId,
    layoutVersion,
    layoutSummaries,
    persistStatus: displayStatus,
    persistMessage,
    isDirty,
    discardChanges,
    selectPersistedLayout: (id) => selectPersistedLayout(id, false),
    setDefaultPersistedLayout,
    deletePersistedLayout,
    renamePersistedLayout,
    restorePresetRemote,
    refreshLayoutList,
    pendingPresetConfirm,
    confirmPendingPreset: () => {
      const id = pendingPresetConfirm;
      setPendingPresetConfirm(null);
      if (id) applyPresetNow(id);
    },
    cancelPendingPreset: () => setPendingPresetConfirm(null),
  };

  return (
    <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>
  );
}

export function useLayout() {
  const ctx = useContext(LayoutContext);
  if (!ctx) {
    throw new Error("useLayout must be used within LayoutProvider");
  }
  return ctx;
}

export type { DashboardLayoutSnapshot };
