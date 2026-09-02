import {
  canonicalizeCapability,
  FUTURE_CAPABILITIES,
  isProductCapability,
  type ProductCapability,
} from "./capabilities.ts";
import { getSegmentProfile, DEFAULT_LEGACY_TERMINOLOGY } from "./profiles.ts";
import {
  isProductSegmentId,
  parseSegmentConfig,
  SEGMENT_ENGINE_VERSION,
  type ProductSegmentId,
  type ResolvedSegmentContext,
  type TenantSegmentConfig,
} from "./types.ts";

/** IDs novos (nunca existiram no nav legado com este valor persistido). */
const NEW_PRODUCT_IDS: readonly string[] = [
  "barbearia",
  "clinica_estetica",
  "consultorio_odontologico",
  "lava_rapido",
  "restaurante",
];

const ALIASES: Record<string, ProductSegmentId> = {
  oficina: "oficina",
  auto_center: "oficina",
  barbearia: "barbearia",
  lava_rapido: "lava_rapido",
  "lava-rapido": "lava_rapido",
  lavarapido: "lava_rapido",
  "lava rapido": "lava_rapido",
  estetica_automotiva: "lava_rapido",
  "estetica-automotiva": "lava_rapido",
  consultoria: "consultoria",
  clinica_estetica: "clinica_estetica",
  consultorio_odontologico: "consultorio_odontologico",
  odontologia: "consultorio_odontologico",
  estetica: "clinica_estetica",
  clinica: "clinica_estetica",
};

export function mapStoredSegmentToProduct(
  stored: string | null | undefined,
): ProductSegmentId | null {
  if (!stored?.trim()) return null;
  const key = stored.trim().toLowerCase();
  return ALIASES[key] ?? (isProductSegmentId(key) ? key : null);
}

/**
 * Tenants sem perfil de produto 35.0 mantêm UX atual.
 * Engine liga quando há segmento de produto E (version >= 1 OU id novo).
 */
export function usesCapabilityEngine(
  storedSegment: string | null | undefined,
  segmentVersion: number | null | undefined,
): boolean {
  const product = mapStoredSegmentToProduct(storedSegment);
  if (!product) return false;
  if (segmentVersion != null && Number(segmentVersion) >= 1) return true;
  const id = (storedSegment ?? "").trim().toLowerCase();
  return NEW_PRODUCT_IDS.includes(id) || NEW_PRODUCT_IDS.includes(product);
}

const FUTURE_SET = new Set<ProductCapability>(FUTURE_CAPABILITIES);

export function applyOverrides(
  base: ReadonlySet<ProductCapability>,
  config: TenantSegmentConfig,
): Set<ProductCapability> {
  const next = new Set(base);
  for (const raw of config.enabledCapabilities ?? []) {
    const c = canonicalizeCapability(raw) ?? (isProductCapability(raw) ? raw : null);
    if (!c || FUTURE_SET.has(c)) continue;
    next.add(c);
  }
  for (const raw of config.disabledCapabilities ?? []) {
    const c = canonicalizeCapability(raw) ?? (isProductCapability(raw) ? raw : null);
    if (!c) continue;
    next.delete(c);
  }
  return next;
}

export function hasCapability(
  ctx: ResolvedSegmentContext,
  capability: ProductCapability | string,
): boolean {
  if (!ctx.usesCapabilityEngine) return true;
  const id = canonicalizeCapability(capability);
  if (!id) return false;
  return ctx.capabilities.has(id);
}

export type ResolveSegmentInput = {
  segment?: string | null;
  segmentVersion?: number | null;
  segmentConfig?: unknown;
};

export function resolveSegmentContext(
  input: ResolveSegmentInput | string | null | undefined,
): ResolvedSegmentContext {
  const raw =
    typeof input === "object" && input !== null && !Array.isArray(input)
      ? input
      : { segment: input as string | null | undefined };
  const stored = raw.segment?.trim() ? raw.segment.trim() : null;
  const version =
    raw.segmentVersion == null || Number.isNaN(Number(raw.segmentVersion))
      ? null
      : Number(raw.segmentVersion);
  const config = parseSegmentConfig(raw.segmentConfig);
  const product = mapStoredSegmentToProduct(stored);
  const engine = usesCapabilityEngine(stored, version);
  const profile = product ? getSegmentProfile(product) : null;
  const legacy = !engine;

  const baseCaps = new Set<ProductCapability>(
    profile ? profile.capabilities : [],
  );
  const capabilities = engine
    ? applyOverrides(baseCaps, config)
    : new Set<ProductCapability>();

  const terminology = {
    ...DEFAULT_LEGACY_TERMINOLOGY,
    ...(profile?.terminology ?? {}),
    ...(config.terminology ?? {}),
  };

  return {
    productSegment: product,
    storedSegment: stored,
    usesCapabilityEngine: engine,
    engineVersion: version,
    profile,
    capabilities,
    terminology,
    financePresetIds: profile?.financePresetIds ?? [],
    config,
    legacy,
  };
}

export function isSegmentEngineCurrent(version: number | null | undefined) {
  return version === SEGMENT_ENGINE_VERSION;
}
