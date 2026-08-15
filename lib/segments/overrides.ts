/**
 * Sprint 35.1 — Overrides tenant-safe (puro). Não apaga dados.
 */
import {
  FUTURE_CAPABILITIES,
  canonicalizeCapability,
  isProductCapability,
  type ProductCapability,
} from "./capabilities.ts";
import type { TenantSegmentConfig } from "./types.ts";

const FUTURE = new Set<ProductCapability>(FUTURE_CAPABILITIES);

export function canEnableCapability(capability: ProductCapability): boolean {
  return !FUTURE.has(capability);
}

function uniqueCaps(list: ProductCapability[]): ProductCapability[] {
  return [...new Set(list)];
}

function normalizeList(raw: unknown): ProductCapability[] {
  if (!Array.isArray(raw)) return [];
  const out: ProductCapability[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const id = canonicalizeCapability(item);
    if (id) out.push(id);
    else if (isProductCapability(item)) out.push(item);
  }
  return uniqueCaps(out);
}

export function setCapabilityOverride(
  preset: ReadonlySet<ProductCapability> | readonly ProductCapability[],
  config: TenantSegmentConfig,
  capability: ProductCapability,
  enabled: boolean,
): TenantSegmentConfig {
  if (enabled && FUTURE.has(capability)) {
    return { ...config };
  }
  const presetSet = new Set(preset);
  const enabledList = normalizeList(config.enabledCapabilities);
  const disabledList = normalizeList(config.disabledCapabilities);
  const inPreset = presetSet.has(capability);

  const nextEnabled = enabledList.filter((c) => c !== capability);
  const nextDisabled = disabledList.filter((c) => c !== capability);

  if (enabled) {
    if (!inPreset) nextEnabled.push(capability);
  } else if (inPreset) {
    nextDisabled.push(capability);
  }

  return {
    ...config,
    enabledCapabilities: nextEnabled.length ? uniqueCaps(nextEnabled) : [],
    disabledCapabilities: nextDisabled.length ? uniqueCaps(nextDisabled) : [],
  };
}

export function resetSegmentConfig(): TenantSegmentConfig {
  return {};
}

export function hasTenantOverrides(config: TenantSegmentConfig): boolean {
  return (
    (config.enabledCapabilities?.length ?? 0) > 0 ||
    (config.disabledCapabilities?.length ?? 0) > 0
  );
}

export function configAfterSegmentChange(
  previous: TenantSegmentConfig,
  mode: "reset" | "preserve",
): TenantSegmentConfig {
  if (mode === "reset") return resetSegmentConfig();
  return {
    enabledCapabilities: (previous.enabledCapabilities ?? []).filter(
      (c) => isProductCapability(c) && !FUTURE.has(c),
    ),
    disabledCapabilities: (previous.disabledCapabilities ?? []).filter(
      (c) => isProductCapability(c) && !FUTURE.has(c),
    ),
  };
}

export function originForCapability(
  preset: ReadonlySet<ProductCapability> | readonly ProductCapability[],
  config: TenantSegmentConfig,
  capability: ProductCapability,
): "segment" | "custom" {
  const presetSet = new Set(preset);
  const enabled = new Set(normalizeList(config.enabledCapabilities));
  const disabled = new Set(normalizeList(config.disabledCapabilities));
  if (presetSet.has(capability) && disabled.has(capability)) return "custom";
  if (!presetSet.has(capability) && enabled.has(capability)) return "custom";
  return "segment";
}
