import AsyncStorage from "@react-native-async-storage/async-storage";

import type { MobileExecutiveDashboard } from "@/api/mobile-api";

const KEY_PREFIX = "@gof/cache/dashboard-snapshot/";

/** Snapshot de apresentação (strings já formatadas). Sem tokens. */
export async function saveDashboardSnapshot(
  tenantId: string,
  data: MobileExecutiveDashboard,
): Promise<void> {
  if (!tenantId) return;
  const compact: MobileExecutiveDashboard = {
    ...data,
    // Mantém só o necessário para UI offline — sem campos extras
  };
  await AsyncStorage.setItem(
    KEY_PREFIX + tenantId,
    JSON.stringify({ savedAt: Date.now(), data: compact }),
  );
}

export async function loadDashboardSnapshot(
  tenantId: string,
): Promise<{ savedAt: number; data: MobileExecutiveDashboard } | null> {
  if (!tenantId) return null;
  try {
    const raw = await AsyncStorage.getItem(KEY_PREFIX + tenantId);
    if (!raw) return null;
    return JSON.parse(raw) as { savedAt: number; data: MobileExecutiveDashboard };
  } catch {
    return null;
  }
}

export async function clearDashboardSnapshot(tenantId: string): Promise<void> {
  if (!tenantId) return;
  await AsyncStorage.removeItem(KEY_PREFIX + tenantId);
}

export function minutesSince(savedAt: number): number {
  return Math.max(0, Math.round((Date.now() - savedAt) / 60_000));
}
