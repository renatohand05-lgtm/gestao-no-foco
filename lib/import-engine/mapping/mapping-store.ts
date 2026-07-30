import type { ImportColumnMapping, ImportMappingProfile } from "../types/index.ts";

export type SaveImportMappingInput = {
  tenantId: string;
  module: string;
  targetEntity: string;
  name: string;
  mapping: ImportColumnMapping;
  makeDefault?: boolean;
  description?: string | null;
  format?: string | null;
  transformations?: Record<string, unknown>;
  normalizations?: Record<string, unknown>;
  rules?: Record<string, unknown>;
  createdBy?: string | null;
};

export interface ImportMappingStore {
  list(tenantId: string, module: string): Promise<ImportMappingProfile[]>;
  getDefault(
    tenantId: string,
    module: string,
    targetEntity: string,
  ): Promise<ImportMappingProfile | null>;
  getById(tenantId: string, id: string): Promise<ImportMappingProfile | null>;
  save(input: SaveImportMappingInput): Promise<ImportMappingProfile>;
  /** Cria uma cópia do perfil `id` com um novo nome (nunca é o padrão). */
  duplicate(
    tenantId: string,
    id: string,
    name: string,
  ): Promise<ImportMappingProfile>;
  remove(tenantId: string, id: string): Promise<void>;
  /** Incrementa `importCount` e atualiza `lastUsedAt` (chamado após commit). */
  touchUsage(tenantId: string, id: string): Promise<void>;
}

/** In-memory store — durable adapter (Supabase) pode substituir sem mudar a engine. */
export class MemoryImportMappingStore implements ImportMappingStore {
  private profiles: ImportMappingProfile[] = [];

  async list(tenantId: string, module: string) {
    return this.profiles.filter(
      (p) => p.tenantId === tenantId && p.module === module,
    );
  }

  async getDefault(tenantId: string, module: string, targetEntity: string) {
    const list = await this.list(tenantId, module);
    return (
      list.find((p) => p.targetEntity === targetEntity && p.isDefault) ??
      list.find((p) => p.targetEntity === targetEntity && p.name === "default") ??
      list.find((p) => p.targetEntity === targetEntity) ??
      null
    );
  }

  async getById(tenantId: string, id: string) {
    return (
      this.profiles.find((p) => p.tenantId === tenantId && p.id === id) ?? null
    );
  }

  async save(input: SaveImportMappingInput) {
    const now = new Date().toISOString();
    const existing = this.profiles.findIndex(
      (p) =>
        p.tenantId === input.tenantId &&
        p.module === input.module &&
        p.targetEntity === input.targetEntity &&
        p.name === input.name,
    );

    if (input.makeDefault) {
      for (const p of this.profiles) {
        if (
          p.tenantId === input.tenantId &&
          p.module === input.module &&
          p.targetEntity === input.targetEntity
        ) {
          p.isDefault = false;
        }
      }
    }

    const previous = existing >= 0 ? this.profiles[existing] : undefined;
    const profile: ImportMappingProfile = {
      id: previous?.id ?? `map_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      tenantId: input.tenantId,
      module: input.module,
      name: input.name,
      targetEntity: input.targetEntity,
      mapping: { ...input.mapping },
      description: input.description ?? previous?.description ?? null,
      format: input.format ?? previous?.format ?? null,
      isDefault: input.makeDefault ?? previous?.isDefault ?? false,
      transformations: input.transformations ?? previous?.transformations ?? {},
      normalizations: input.normalizations ?? previous?.normalizations ?? {},
      rules: input.rules ?? previous?.rules ?? {},
      importCount: previous?.importCount ?? 0,
      lastUsedAt: previous?.lastUsedAt ?? null,
      createdBy: input.createdBy ?? previous?.createdBy ?? null,
      createdAt: previous?.createdAt ?? now,
      updatedAt: now,
    };
    if (existing >= 0) this.profiles[existing] = profile;
    else this.profiles.push(profile);
    return profile;
  }

  async duplicate(tenantId: string, id: string, name: string) {
    const original = await this.getById(tenantId, id);
    if (!original) {
      throw new Error("Perfil de mapeamento não encontrado.");
    }
    const now = new Date().toISOString();
    const copy: ImportMappingProfile = {
      ...original,
      id: `map_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      isDefault: false,
      importCount: 0,
      lastUsedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    this.profiles.push(copy);
    return copy;
  }

  async remove(tenantId: string, id: string) {
    this.profiles = this.profiles.filter(
      (p) => !(p.tenantId === tenantId && p.id === id),
    );
  }

  async touchUsage(tenantId: string, id: string) {
    const profile = this.profiles.find(
      (p) => p.tenantId === tenantId && p.id === id,
    );
    if (!profile) return;
    profile.importCount = (profile.importCount ?? 0) + 1;
    profile.lastUsedAt = new Date().toISOString();
  }
}

let singleton: MemoryImportMappingStore | null = null;

export function getGlobalMemoryMappingStore() {
  if (!singleton) singleton = new MemoryImportMappingStore();
  return singleton;
}
