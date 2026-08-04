import AsyncStorage from "@react-native-async-storage/async-storage";

import type { MobileSearchHit } from "@/api/mobile-api";

const KEY = (tenantId: string, branchId: string | null) =>
  `@gof/cache/search-last/${tenantId}/${branchId || "none"}`;

export type SearchCachePayload = {
  savedAt: number;
  q: string;
  items: MobileSearchHit[];
};

export async function saveSearchCache(
  tenantId: string,
  branchId: string | null,
  q: string,
  items: MobileSearchHit[],
): Promise<void> {
  if (!tenantId || !q) return;
  const payload: SearchCachePayload = {
    savedAt: Date.now(),
    q,
    items: items.slice(0, 30).map((i) => ({
      ...i,
      // sem campos extras
    })),
  };
  await AsyncStorage.setItem(KEY(tenantId, branchId), JSON.stringify(payload));
}

export async function loadSearchCache(
  tenantId: string,
  branchId: string | null,
): Promise<SearchCachePayload | null> {
  if (!tenantId) return null;
  try {
    const raw = await AsyncStorage.getItem(KEY(tenantId, branchId));
    return raw ? (JSON.parse(raw) as SearchCachePayload) : null;
  } catch {
    return null;
  }
}

export async function clearSearchCache(
  tenantId: string,
  branchId: string | null,
): Promise<void> {
  if (!tenantId) return;
  await AsyncStorage.removeItem(KEY(tenantId, branchId));
}
