import AsyncStorage from "@react-native-async-storage/async-storage";

import { clearSearchCache } from "@/productivity/search-cache";
import type { FavoriteItem, RecentItem } from "@/productivity/types";

function scopeKey(
  kind: "recent" | "favorites",
  userId: string,
  tenantId: string,
  branchId: string | null,
): string {
  const branch = branchId || "none";
  return `@gof/prod/${kind}/${userId}/${tenantId}/${branch}`;
}

const MAX_RECENT = 20;
const MAX_FAVORITES = 24;

/** Metadados mínimos — sem valores financeiros sensíveis. */
export async function loadRecents(
  userId: string,
  tenantId: string,
  branchId: string | null,
): Promise<RecentItem[]> {
  if (!userId || !tenantId) return [];
  try {
    const raw = await AsyncStorage.getItem(
      scopeKey("recent", userId, tenantId, branchId),
    );
    return raw ? (JSON.parse(raw) as RecentItem[]) : [];
  } catch {
    return [];
  }
}

export async function pushRecent(
  userId: string,
  tenantId: string,
  branchId: string | null,
  item: Omit<RecentItem, "at">,
): Promise<void> {
  if (!userId || !tenantId) return;
  const safe: RecentItem = {
    id: item.id,
    type: item.type,
    title: item.title.slice(0, 80),
    subtitle: item.subtitle?.slice(0, 80) ?? null,
    route: item.route,
    opensWeb: Boolean(item.opensWeb),
    at: Date.now(),
  };
  const list = await loadRecents(userId, tenantId, branchId);
  const next = [safe, ...list.filter((x) => !(x.id === safe.id && x.type === safe.type))].slice(
    0,
    MAX_RECENT,
  );
  await AsyncStorage.setItem(
    scopeKey("recent", userId, tenantId, branchId),
    JSON.stringify(next),
  );
}

export async function clearRecents(
  userId: string,
  tenantId: string,
  branchId: string | null,
): Promise<void> {
  if (!userId || !tenantId) return;
  await AsyncStorage.removeItem(scopeKey("recent", userId, tenantId, branchId));
}

export async function loadFavorites(
  userId: string,
  tenantId: string,
  branchId: string | null,
): Promise<FavoriteItem[]> {
  if (!userId || !tenantId) return [];
  try {
    const raw = await AsyncStorage.getItem(
      scopeKey("favorites", userId, tenantId, branchId),
    );
    return raw ? (JSON.parse(raw) as FavoriteItem[]) : [];
  } catch {
    return [];
  }
}

export async function toggleFavorite(
  userId: string,
  tenantId: string,
  branchId: string | null,
  item: Omit<FavoriteItem, "order">,
): Promise<FavoriteItem[]> {
  const list = await loadFavorites(userId, tenantId, branchId);
  const exists = list.find((x) => x.id === item.id && x.type === item.type);
  let next: FavoriteItem[];
  if (exists) {
    next = list.filter((x) => !(x.id === item.id && x.type === item.type));
  } else {
    next = [
      ...list,
      {
        ...item,
        title: item.title.slice(0, 80),
        subtitle: item.subtitle?.slice(0, 80) ?? null,
        order: list.length,
      },
    ].slice(0, MAX_FAVORITES);
  }
  await AsyncStorage.setItem(
    scopeKey("favorites", userId, tenantId, branchId),
    JSON.stringify(next),
  );
  return next;
}

export async function clearFavorites(
  userId: string,
  tenantId: string,
  branchId: string | null,
): Promise<void> {
  if (!userId || !tenantId) return;
  await AsyncStorage.removeItem(scopeKey("favorites", userId, tenantId, branchId));
}

/** Limpa caches de produtividade do escopo (logout / troca). */
export async function clearProductivityCaches(
  userId: string,
  tenantId: string,
  branchId: string | null,
): Promise<void> {
  await Promise.all([
    clearRecents(userId, tenantId, branchId),
    clearFavorites(userId, tenantId, branchId),
    clearSearchCache(tenantId, branchId),
  ]);
}
