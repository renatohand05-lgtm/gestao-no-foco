/**
 * Mappers row ↔ domínio — Sprint 13.6
 */

import { migrateLayoutData } from "@/lib/dashboard-layout/persistence/layout-versioning";
import type {
  DashboardLayoutRecord,
  DashboardLayoutSummary,
  LayoutDensityProfile,
  PersistedLayoutData,
} from "@/lib/dashboard-layout/persistence/types";

export type DashboardLayoutRow = {
  id: string;
  tenant_id: string;
  user_id: string;
  name: string;
  preset_key: string | null;
  layout_data: unknown;
  density: string | null;
  is_default: boolean;
  is_active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

function toDensity(value: string | null): LayoutDensityProfile | null {
  if (
    value === "executive" ||
    value === "comfortable" ||
    value === "compact"
  ) {
    return value;
  }
  return null;
}

export function mapLayoutRow(row: DashboardLayoutRow): DashboardLayoutRecord | null {
  const layout_data = migrateLayoutData(row.layout_data);
  if (!layout_data) return null;

  return {
    id: row.id,
    tenant_id: row.tenant_id,
    user_id: row.user_id,
    name: row.name,
    preset_key: row.preset_key,
    layout_data,
    density: toDensity(row.density) ?? layout_data.densityProfile ?? null,
    is_default: row.is_default,
    is_active: row.is_active,
    version: row.version,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at,
  };
}

export function toLayoutSummary(
  record: DashboardLayoutRecord,
): DashboardLayoutSummary {
  return {
    id: record.id,
    name: record.name,
    preset_key: record.preset_key,
    density: record.density,
    is_default: record.is_default,
    version: record.version,
    updated_at: record.updated_at,
  };
}

export function buildPersistedPayload(input: {
  name: string;
  presetId: PersistedLayoutData["presetId"];
  compactMode: boolean;
  blocks: PersistedLayoutData["blocks"];
  densityProfile?: LayoutDensityProfile;
}): PersistedLayoutData {
  return {
    version: 1,
    name: input.name,
    presetId: input.presetId,
    updatedAt: new Date().toISOString(),
    compactMode: input.compactMode,
    blocks: input.blocks,
    densityProfile: input.densityProfile,
  };
}
