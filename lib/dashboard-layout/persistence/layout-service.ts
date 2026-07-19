/**
 * Service de persistência de layouts — Sprint 13.6
 * Sem acesso direto a partir de componentes React.
 */

import {
  applyPreset,
  createInitialLayoutState,
  toSnapshot,
} from "@/lib/dashboard-layout/layout-engine";
import type { LayoutPresetId } from "@/lib/dashboard-layout/layout-types";
import { getLayoutPreset } from "@/lib/dashboard-layout/layout-presets";
import { DashboardLayoutRepository } from "@/lib/dashboard-layout/persistence/layout-repository";
import { buildPersistedPayload } from "@/lib/dashboard-layout/persistence/layout-mappers";
import {
  validateAndNormalizeLayoutData,
  validateDensityProfile,
  validateLayoutName,
} from "@/lib/dashboard-layout/persistence/layout-validation";
import { bumpRecordVersion } from "@/lib/dashboard-layout/persistence/layout-versioning";
import type {
  BootstrapLayoutResult,
  DashboardLayoutRecord,
  DashboardLayoutSummary,
  SaveDashboardLayoutInput,
} from "@/lib/dashboard-layout/persistence/types";
import { createClient } from "@/lib/supabase/server";

function ceoFallbackSnapshot(): BootstrapLayoutResult["snapshot"] {
  const state = applyPreset(createInitialLayoutState(), "ceo");
  const snap = toSnapshot(state);
  return {
    ...snap,
    updatedAt: new Date().toISOString(),
    densityProfile: "comfortable",
  };
}

export class DashboardLayoutService {
  private readonly repo: DashboardLayoutRepository;

  constructor(
    repo: DashboardLayoutRepository,
    private readonly tenantId: string,
    private readonly userId: string,
  ) {
    this.repo = repo;
  }

  async bootstrap(): Promise<BootstrapLayoutResult> {
    const summaries = await this.repo.listSummaries();
    const record =
      (await this.repo.getDefault()) ?? (await this.repo.getMostRecent());

    if (!record) {
      const snapshot = ceoFallbackSnapshot();
      return {
        record: null,
        summaries,
        snapshot,
        densityProfile: "comfortable",
        source: "fallback_ceo",
      };
    }

    return {
      record,
      summaries,
      snapshot: record.layout_data,
      densityProfile:
        record.density ??
        record.layout_data.densityProfile ??
        "comfortable",
      source: "persisted",
    };
  }

  async list(): Promise<DashboardLayoutSummary[]> {
    return this.repo.listSummaries();
  }

  async get(id: string): Promise<DashboardLayoutRecord | null> {
    return this.repo.getById(id);
  }

  async save(input: SaveDashboardLayoutInput): Promise<DashboardLayoutRecord> {
    const name = validateLayoutName(input.name);
    const layoutData = validateAndNormalizeLayoutData({
      ...input.layoutData,
      name,
    });
    const density =
      input.density !== undefined
        ? validateDensityProfile(input.density)
        : validateDensityProfile(layoutData.densityProfile ?? null);

    const preset_key =
      input.presetKey === undefined
        ? layoutData.presetId
        : input.presetKey;

    if (input.isDefault) {
      await this.repo.clearDefaults();
    }

    if (input.id) {
      const existing = await this.repo.getById(input.id);
      if (!existing) throw new Error("Layout não encontrado.");

      const expected = input.expectedVersion ?? existing.version;
      if (expected !== existing.version) {
        throw new Error("CONFLICT_VERSION");
      }

      return this.repo.update(input.id, {
        name,
        preset_key,
        layout_data: layoutData,
        density,
        expectedVersion: expected,
        nextVersion: bumpRecordVersion(expected),
      });
    }

    const shouldDefault =
      input.isDefault === true ||
      (await this.repo.listSummaries()).length === 0;

    if (shouldDefault) await this.repo.clearDefaults();

    return this.repo.insert({
      name,
      preset_key,
      layout_data: layoutData,
      density,
      is_default: shouldDefault,
    });
  }

  async duplicate(id: string): Promise<DashboardLayoutRecord> {
    const source = await this.repo.getById(id);
    if (!source) throw new Error("Layout não encontrado.");

    return this.repo.insert({
      name: `${source.name} (cópia)`.slice(0, 120),
      preset_key: "custom",
      layout_data: {
        ...source.layout_data,
        name: `${source.name} (cópia)`.slice(0, 120),
        presetId: "custom",
        updatedAt: new Date().toISOString(),
      },
      density: source.density,
      is_default: false,
    });
  }

  async rename(id: string, name: string): Promise<DashboardLayoutRecord> {
    return this.repo.rename(id, validateLayoutName(name));
  }

  async setDefault(id: string): Promise<void> {
    const existing = await this.repo.getById(id);
    if (!existing) throw new Error("Layout não encontrado.");
    await this.repo.setDefault(id);
  }

  async softDelete(id: string): Promise<void> {
    await this.repo.softDelete(id);
  }

  async restorePreset(presetKey: LayoutPresetId): Promise<DashboardLayoutRecord> {
    if (presetKey === "custom") {
      throw new Error("Preset custom não pode ser restaurado.");
    }
    const preset = getLayoutPreset(presetKey);
    if (!preset) throw new Error("Preset inválido.");

    const state = applyPreset(createInitialLayoutState(), presetKey);
    const snap = toSnapshot(state);
    const layoutData = validateAndNormalizeLayoutData({
      ...snap,
      name: preset.label,
      updatedAt: new Date().toISOString(),
      densityProfile: "comfortable",
    });

    await this.repo.clearDefaults();
    return this.repo.insert({
      name: preset.label,
      preset_key: presetKey,
      layout_data: layoutData,
      density: "comfortable",
      is_default: true,
    });
  }

  async importJson(
    raw: string,
    options?: { name?: string; setDefault?: boolean },
  ): Promise<DashboardLayoutRecord> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error("JSON inválido.");
    }

    const layoutData = validateAndNormalizeLayoutData(parsed);
    if (options?.name) {
      layoutData.name = validateLayoutName(options.name);
    }

    return this.save({
      name: layoutData.name,
      presetKey: layoutData.presetId,
      layoutData,
      density: layoutData.densityProfile ?? "comfortable",
      isDefault: options?.setDefault ?? false,
    });
  }

  buildExportPayload(record: DashboardLayoutRecord): string {
    return JSON.stringify(
      buildPersistedPayload({
        name: record.name,
        presetId: record.layout_data.presetId,
        compactMode: record.layout_data.compactMode,
        blocks: record.layout_data.blocks,
        densityProfile: record.density ?? undefined,
      }),
      null,
      2,
    );
  }
}

export async function createDashboardLayoutService(
  tenantId: string,
  userId: string,
) {
  const supabase = await createClient();
  const repo = new DashboardLayoutRepository(supabase, tenantId, userId);
  return new DashboardLayoutService(repo, tenantId, userId);
}

/** Bootstrap seguro para a page — nunca lança. */
export async function bootstrapDashboardLayoutSafe(
  tenantId: string,
  userId: string,
): Promise<BootstrapLayoutResult> {
  try {
    const service = await createDashboardLayoutService(tenantId, userId);
    return await service.bootstrap();
  } catch {
    const snapshot = ceoFallbackSnapshot();
    return {
      record: null,
      summaries: [],
      snapshot,
      densityProfile: "comfortable",
      source: "fallback_ceo",
    };
  }
}
