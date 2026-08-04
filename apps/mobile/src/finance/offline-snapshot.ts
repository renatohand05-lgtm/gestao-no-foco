import AsyncStorage from "@react-native-async-storage/async-storage";

import type { MobileFinanceSummary } from "@/api/mobile-api";

const KEY_PREFIX = "@gof/cache/finance-summary/";

/** Snapshot de apresentação (strings formatadas). Sem tokens / sem mutações. */
export async function saveFinanceSnapshot(
  tenantId: string,
  data: MobileFinanceSummary,
): Promise<void> {
  if (!tenantId) return;
  await AsyncStorage.setItem(
    KEY_PREFIX + tenantId,
    JSON.stringify({ savedAt: Date.now(), data }),
  );
}

export async function loadFinanceSnapshot(
  tenantId: string,
): Promise<{ savedAt: number; data: MobileFinanceSummary } | null> {
  if (!tenantId) return null;
  try {
    const raw = await AsyncStorage.getItem(KEY_PREFIX + tenantId);
    if (!raw) return null;
    return JSON.parse(raw) as { savedAt: number; data: MobileFinanceSummary };
  } catch {
    return null;
  }
}

export async function clearFinanceSnapshot(tenantId: string): Promise<void> {
  if (!tenantId) return;
  await AsyncStorage.removeItem(KEY_PREFIX + tenantId);
}

export function minutesSince(savedAt: number): number {
  return Math.max(0, Math.round((Date.now() - savedAt) / 60_000));
}
