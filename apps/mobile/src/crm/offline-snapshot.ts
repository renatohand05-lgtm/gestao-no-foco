import AsyncStorage from "@react-native-async-storage/async-storage";

import type { MobileCrmDashboard } from "@/api/mobile-api";

const KEY_PREFIX = "@gof/cache/crm-summary/";

/** Snapshot de apresentação (strings formatadas). Sem tokens / sem mutações. */
export async function saveCrmSnapshot(
  tenantId: string,
  data: MobileCrmDashboard,
): Promise<void> {
  if (!tenantId) return;
  await AsyncStorage.setItem(
    KEY_PREFIX + tenantId,
    JSON.stringify({ savedAt: Date.now(), data }),
  );
}

export async function loadCrmSnapshot(
  tenantId: string,
): Promise<{ savedAt: number; data: MobileCrmDashboard } | null> {
  if (!tenantId) return null;
  try {
    const raw = await AsyncStorage.getItem(KEY_PREFIX + tenantId);
    if (!raw) return null;
    return JSON.parse(raw) as { savedAt: number; data: MobileCrmDashboard };
  } catch {
    return null;
  }
}

export async function clearCrmSnapshot(tenantId: string): Promise<void> {
  if (!tenantId) return;
  await AsyncStorage.removeItem(KEY_PREFIX + tenantId);
}

export function minutesSince(savedAt: number): number {
  return Math.max(0, Math.round((Date.now() - savedAt) / 60_000));
}
