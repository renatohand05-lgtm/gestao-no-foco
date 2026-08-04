import AsyncStorage from "@react-native-async-storage/async-storage";

import type { MobileOpsDashboard } from "@/api/mobile-api";

const KEY_PREFIX = "@gof/cache/ops-summary/";

/** Snapshot RO do dashboard (strings formatadas). Sem tokens / sem mutações. */
export async function saveOpsSnapshot(
  tenantId: string,
  data: MobileOpsDashboard,
): Promise<void> {
  if (!tenantId) return;
  await AsyncStorage.setItem(
    KEY_PREFIX + tenantId,
    JSON.stringify({ savedAt: Date.now(), data }),
  );
}

export async function loadOpsSnapshot(
  tenantId: string,
): Promise<{ savedAt: number; data: MobileOpsDashboard } | null> {
  if (!tenantId) return null;
  try {
    const raw = await AsyncStorage.getItem(KEY_PREFIX + tenantId);
    if (!raw) return null;
    return JSON.parse(raw) as { savedAt: number; data: MobileOpsDashboard };
  } catch {
    return null;
  }
}

export async function clearOpsSnapshot(tenantId: string): Promise<void> {
  if (!tenantId) return;
  await AsyncStorage.removeItem(KEY_PREFIX + tenantId);
}

export function minutesSince(savedAt: number): number {
  return Math.max(0, Math.round((Date.now() - savedAt) / 60_000));
}
