/**
 * Validação de layout_data — Sprint 13.6
 * Rejeita JSON inválido, blocos desconhecidos, densidade inválida, etc.
 */

import {
  ALL_LAYOUT_BLOCKS,
  LAYOUT_SCHEMA_VERSION,
  type LayoutBlockId,
  type LayoutBlockState,
  type LayoutDensity,
  type LayoutPresetId,
} from "@/lib/dashboard-layout/layout-types";
import { reindexOrders } from "@/lib/dashboard-layout/layout-engine";
import {
  LAYOUT_DATA_MAX_BYTES,
  type LayoutDensityProfile,
  type PersistedLayoutData,
} from "@/lib/dashboard-layout/persistence/types";

const VALID_DENSITIES: LayoutDensity[] = [
  "normal",
  "compact",
  "expandido",
  "recolhido",
];

const VALID_PROFILES: LayoutDensityProfile[] = [
  "executive",
  "comfortable",
  "compact",
];

const VALID_PRESETS: LayoutPresetId[] = [
  "ceo",
  "financeiro",
  "comercial",
  "operacional",
  "rh",
  "oficina",
  "restaurante",
  "consultoria",
  "custom",
];

export class LayoutValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LayoutValidationError";
  }
}

function isBlockId(id: unknown): id is LayoutBlockId {
  return typeof id === "string" && ALL_LAYOUT_BLOCKS.includes(id as LayoutBlockId);
}

function isDensity(value: unknown): value is LayoutDensity {
  return typeof value === "string" && VALID_DENSITIES.includes(value as LayoutDensity);
}

function isProfile(value: unknown): value is LayoutDensityProfile {
  return (
    typeof value === "string" &&
    VALID_PROFILES.includes(value as LayoutDensityProfile)
  );
}

function assertPayloadSize(raw: unknown) {
  const size = new TextEncoder().encode(JSON.stringify(raw)).length;
  if (size > LAYOUT_DATA_MAX_BYTES) {
    throw new LayoutValidationError(
      `Layout excede o tamanho máximo (${LAYOUT_DATA_MAX_BYTES} bytes).`,
    );
  }
}

/**
 * Valida e normaliza layout_data. Completa blocos faltantes.
 * Migra version desconhecida de forma segura quando possível.
 */
export function validateAndNormalizeLayoutData(
  input: unknown,
): PersistedLayoutData {
  if (input === null || typeof input !== "object") {
    throw new LayoutValidationError("layout_data inválido.");
  }

  assertPayloadSize(input);

  const data = input as Record<string, unknown>;
  const version = data.version;

  if (version !== LAYOUT_SCHEMA_VERSION && version !== 1) {
    // Migração segura: só aceita v1 conhecido
    throw new LayoutValidationError(
      `Versão de layout não suportada (${String(version)}).`,
    );
  }

  if (!Array.isArray(data.blocks)) {
    throw new LayoutValidationError("layout_data.blocks é obrigatório.");
  }

  const seen = new Set<string>();
  const blocks: LayoutBlockState[] = [];

  for (const raw of data.blocks) {
    if (!raw || typeof raw !== "object") {
      throw new LayoutValidationError("Bloco de layout inválido.");
    }
    const b = raw as Record<string, unknown>;
    if (!isBlockId(b.id)) {
      throw new LayoutValidationError(`Bloco desconhecido: ${String(b.id)}.`);
    }
    if (seen.has(b.id)) {
      throw new LayoutValidationError(`Bloco duplicado: ${b.id}.`);
    }
    seen.add(b.id);
    if (b.density !== undefined && !isDensity(b.density)) {
      throw new LayoutValidationError(`Densidade inválida no bloco ${b.id}.`);
    }
    blocks.push({
      id: b.id,
      visible: Boolean(b.visible ?? true),
      density: isDensity(b.density) ? b.density : "normal",
      order: typeof b.order === "number" && Number.isFinite(b.order) ? b.order : blocks.length,
    });
  }

  const missing = ALL_LAYOUT_BLOCKS.filter((id) => !seen.has(id)).map(
    (id, i) => ({
      id,
      visible: true,
      density: "normal" as LayoutDensity,
      order: blocks.length + i,
    }),
  );

  const presetId = VALID_PRESETS.includes(data.presetId as LayoutPresetId)
    ? (data.presetId as LayoutPresetId)
    : "custom";

  const densityProfile =
    data.densityProfile === undefined
      ? undefined
      : isProfile(data.densityProfile)
        ? data.densityProfile
        : (() => {
            throw new LayoutValidationError("densityProfile inválido.");
          })();

  const name =
    typeof data.name === "string" && data.name.trim()
      ? data.name.trim().slice(0, 120)
      : "Meu dashboard";

  return {
    version: 1,
    name,
    presetId,
    updatedAt:
      typeof data.updatedAt === "string" && data.updatedAt
        ? data.updatedAt
        : new Date().toISOString(),
    compactMode: Boolean(data.compactMode),
    blocks: reindexOrders([...blocks, ...missing]),
    densityProfile,
  };
}

export function validateDensityProfile(
  value: unknown,
): LayoutDensityProfile | null {
  if (value === null || value === undefined) return null;
  if (!isProfile(value)) {
    throw new LayoutValidationError("density inválida.");
  }
  return value;
}

export function validateLayoutName(name: unknown): string {
  if (typeof name !== "string" || !name.trim()) {
    throw new LayoutValidationError("Nome do layout é obrigatório.");
  }
  return name.trim().slice(0, 120);
}
