import * as SecureStore from "expo-secure-store";

import { logger } from "@/observability/logger";

/**
 * Wrappers SecureStore que nunca rejeitam.
 * Erros nativos (keychain locked, valor > ~2048 bytes) não derrubam o app.
 */

export async function safeSecureGet(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch (err) {
    logger.warn("secure.get_failed", {
      key,
      name: err instanceof Error ? err.name : "Error",
    });
    return null;
  }
}

export async function safeSecureSet(
  key: string,
  value: string,
): Promise<boolean> {
  try {
    if (value.length > 2000) {
      logger.warn("secure.set_too_large", { key, length: value.length });
    }
    await SecureStore.setItemAsync(key, value);
    return true;
  } catch (err) {
    logger.warn("secure.set_failed", {
      key,
      length: value.length,
      name: err instanceof Error ? err.name : "Error",
    });
    return false;
  }
}

export async function safeSecureDelete(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    /* ignore */
  }
}
