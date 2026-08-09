import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Cache RO de permissões por tenant (não sensível como token).
 * Evita tabs/Dashboard sumirem no cold start antes do fetch online.
 */
const KEY_PREFIX = "@gof/cache/permissions/";

export async function savePermissionsCache(
  tenantId: string,
  permissions: readonly string[],
): Promise<void> {
  if (!tenantId) return;
  await AsyncStorage.setItem(
    KEY_PREFIX + tenantId,
    JSON.stringify({ savedAt: Date.now(), permissions: [...permissions] }),
  );
}

export async function loadPermissionsCache(
  tenantId: string,
): Promise<readonly string[] | null> {
  if (!tenantId) return null;
  try {
    const raw = await AsyncStorage.getItem(KEY_PREFIX + tenantId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      permissions?: unknown;
    };
    if (!Array.isArray(parsed.permissions)) return null;
    return parsed.permissions.filter((p): p is string => typeof p === "string");
  } catch {
    return null;
  }
}

export async function clearPermissionsCache(tenantId: string): Promise<void> {
  if (!tenantId) return;
  await AsyncStorage.removeItem(KEY_PREFIX + tenantId);
}
