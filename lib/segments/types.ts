/**
 * Sprint 35.0 — Tipos do motor de segmentação.
 * Persistência: tenants.segment (já existia) + segment_version + segment_config.
 */

import type { ProductCapability } from "./capabilities.ts";
import type { DespesaPresetId } from "../financeiro/despesa-presets.ts";
import type { BeneficiarioTipo } from "../financeiro/beneficiario-types.ts";

/** Versão do motor. Tenants com version null = comportamento legado (pré-35.0). */
export const SEGMENT_ENGINE_VERSION = 1 as const;

/** Os 7 segmentos de produto desta fundação. */
export const PRODUCT_SEGMENT_IDS = [
  "oficina",
  "barbearia",
  "lava_rapido",
  "consultoria",
  "clinica_estetica",
  "consultorio_odontologico",
  "restaurante",
] as const;

export type ProductSegmentId = (typeof PRODUCT_SEGMENT_IDS)[number];

export type SegmentTerminology = {
  customer: string;
  customers: string;
  professional: string;
  professionals: string;
  workOrder: string;
  catalog: string;
  appointment: string;
};

export type TenantSegmentConfig = {
  /** Liga capabilities além do preset. */
  enabledCapabilities?: ProductCapability[];
  /** Desliga capabilities do preset (relevância). Nunca concede RBAC. */
  disabledCapabilities?: ProductCapability[];
  /** Reservado — overrides de labels. */
  terminology?: Partial<SegmentTerminology>;
};

export type SegmentProfile = {
  id: ProductSegmentId;
  label: string;
  shortDescription: string;
  version: typeof SEGMENT_ENGINE_VERSION;
  capabilities: readonly ProductCapability[];
  /** Capabilities modeladas mas desligadas (ex.: prontuário futuro). */
  futureCapabilities?: readonly ProductCapability[];
  terminology: SegmentTerminology;
  recommendedNavIds: readonly string[];
  defaultDashboard: "operacoes" | "executivo" | "agenda";
  financePresetIds: readonly DespesaPresetId[];
  costCenterSuggestions: readonly string[];
  beneficiarioTipos: readonly BeneficiarioTipo[];
  onboardingHighlights: readonly string[];
};

export type ResolvedSegmentContext = {
  /** Segmento de produto, ou null se legado sem mapeamento explícito. */
  productSegment: ProductSegmentId | null;
  /** Valor cru persistido em tenants.segment. */
  storedSegment: string | null;
  /** true = aplicar capabilities; false = UX atual pré-35.0. */
  usesCapabilityEngine: boolean;
  engineVersion: number | null;
  profile: SegmentProfile | null;
  capabilities: ReadonlySet<ProductCapability>;
  terminology: SegmentTerminology;
  financePresetIds: readonly DespesaPresetId[];
  config: TenantSegmentConfig;
  legacy: boolean;
};

export function isProductSegmentId(
  value: string | null | undefined,
): value is ProductSegmentId {
  if (!value) return false;
  return (PRODUCT_SEGMENT_IDS as readonly string[]).includes(value);
}

export function parseSegmentConfig(raw: unknown): TenantSegmentConfig {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const o = raw as Record<string, unknown>;
  const enabled = Array.isArray(o.enabledCapabilities)
    ? (o.enabledCapabilities
        .filter((x) => typeof x === "string")
        .map((x) => x as string)
        .filter(Boolean) as ProductCapability[])
    : undefined;
  const disabled = Array.isArray(o.disabledCapabilities)
    ? (o.disabledCapabilities.filter((x) => typeof x === "string") as ProductCapability[])
    : undefined;
  return {
    enabledCapabilities: enabled,
    disabledCapabilities: disabled,
    terminology:
      o.terminology && typeof o.terminology === "object"
        ? (o.terminology as SegmentTerminology)
        : undefined,
  };
}
