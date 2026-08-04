import AsyncStorage from "@react-native-async-storage/async-storage";

import type { MobileStockDashboard } from "@/api/mobile-api";

const KEY_PREFIX = "@gof/cache/stock-summary/";

/** Snapshot RO do dashboard (strings formatadas). Sem tokens / sem mutações. */
export async function saveStockSnapshot(
  tenantId: string,
  data: MobileStockDashboard,
): Promise<void> {
  if (!tenantId) return;
  await AsyncStorage.setItem(
    KEY_PREFIX + tenantId,
    JSON.stringify({ savedAt: Date.now(), data }),
  );
}

export async function loadStockSnapshot(
  tenantId: string,
): Promise<{ savedAt: number; data: MobileStockDashboard } | null> {
  if (!tenantId) return null;
  try {
    const raw = await AsyncStorage.getItem(KEY_PREFIX + tenantId);
    if (!raw) return null;
    return JSON.parse(raw) as { savedAt: number; data: MobileStockDashboard };
  } catch {
    return null;
  }
}

export async function clearStockSnapshot(tenantId: string): Promise<void> {
  if (!tenantId) return;
  await AsyncStorage.removeItem(KEY_PREFIX + tenantId);
}

export function minutesSince(savedAt: number): number {
  return Math.max(0, Math.round((Date.now() - savedAt) / 60_000));
}
