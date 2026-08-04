import AsyncStorage from "@react-native-async-storage/async-storage";

import type { MobileIntelligencePack } from "@/api/mobile-api";

const KEY_PREFIX = "@gof/cache/intelligence-pack/";
const MODULE_KEYS = {
  dashboard: "@gof/cache/dashboard-snapshot/",
  finance: "@gof/cache/finance-summary/",
  crm: "@gof/cache/crm-summary/",
  stock: "@gof/cache/stock-summary/",
  ops: "@gof/cache/ops-summary/",
} as const;

/** Snapshot RO completo do cockpit (strings formatadas). Sem tokens. */
export async function saveIntelligenceSnapshot(
  tenantId: string,
  data: MobileIntelligencePack,
): Promise<void> {
  if (!tenantId) return;
  await AsyncStorage.setItem(
    KEY_PREFIX + tenantId,
    JSON.stringify({ savedAt: Date.now(), data }),
  );
}

export async function loadIntelligenceSnapshot(
  tenantId: string,
): Promise<{ savedAt: number; data: MobileIntelligencePack } | null> {
  if (!tenantId) return null;
  try {
    const raw = await AsyncStorage.getItem(KEY_PREFIX + tenantId);
    if (!raw) return null;
    return JSON.parse(raw) as {
      savedAt: number;
      data: MobileIntelligencePack;
    };
  } catch {
    return null;
  }
}

export async function clearIntelligenceSnapshot(tenantId: string): Promise<void> {
  if (!tenantId) return;
  await AsyncStorage.removeItem(KEY_PREFIX + tenantId);
}

export function minutesSince(savedAt: number): number {
  return Math.max(0, Math.round((Date.now() - savedAt) / 60_000));
}

export type ModuleSyncStatus = {
  module: string;
  savedAt: number | null;
  minutesAgo: number | null;
};

/** Lê timestamps dos snapshots de módulo (somente leitura). */
export async function loadModuleSyncStatuses(
  tenantId: string,
): Promise<ModuleSyncStatus[]> {
  if (!tenantId) return [];
  const entries = Object.entries(MODULE_KEYS) as [
    string,
    (typeof MODULE_KEYS)[keyof typeof MODULE_KEYS],
  ][];
  const out: ModuleSyncStatus[] = [];
  for (const [module, prefix] of entries) {
    try {
      const raw = await AsyncStorage.getItem(prefix + tenantId);
      if (!raw) {
        out.push({ module, savedAt: null, minutesAgo: null });
        continue;
      }
      const parsed = JSON.parse(raw) as { savedAt?: number };
      const savedAt = typeof parsed.savedAt === "number" ? parsed.savedAt : null;
      out.push({
        module,
        savedAt,
        minutesAgo: savedAt != null ? minutesSince(savedAt) : null,
      });
    } catch {
      out.push({ module, savedAt: null, minutesAgo: null });
    }
  }
  return out;
}
