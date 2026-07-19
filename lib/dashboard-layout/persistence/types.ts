/**
 * Persistência de Dashboard Layouts — tipos (Sprint 13.6)
 */

import type {
  DashboardLayoutSnapshot,
  LayoutPresetId,
} from "@/lib/dashboard-layout/layout-types";

export type LayoutDensityProfile = "executive" | "comfortable" | "compact";

/** Payload validado armazenado em layout_data */
export type PersistedLayoutData = DashboardLayoutSnapshot & {
  densityProfile?: LayoutDensityProfile;
};

export type DashboardLayoutRecord = {
  id: string;
  tenant_id: string;
  user_id: string;
  name: string;
  preset_key: string | null;
  layout_data: PersistedLayoutData;
  density: LayoutDensityProfile | null;
  is_default: boolean;
  is_active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type DashboardLayoutSummary = {
  id: string;
  name: string;
  preset_key: string | null;
  density: LayoutDensityProfile | null;
  is_default: boolean;
  version: number;
  updated_at: string;
};

export type SaveDashboardLayoutInput = {
  /** Atualiza registro existente; omitir para criar. */
  id?: string;
  name: string;
  presetKey?: LayoutPresetId | null;
  layoutData: PersistedLayoutData;
  density?: LayoutDensityProfile | null;
  isDefault?: boolean;
  /** Versão esperada (conflito se divergir). */
  expectedVersion?: number;
};

export type BootstrapLayoutResult = {
  record: DashboardLayoutRecord | null;
  summaries: DashboardLayoutSummary[];
  /** Snapshot aplicado (persistido ou fallback CEO). */
  snapshot: PersistedLayoutData;
  densityProfile: LayoutDensityProfile;
  source: "persisted" | "fallback_ceo";
};

export const LAYOUT_DATA_MAX_BYTES = 48_000;
