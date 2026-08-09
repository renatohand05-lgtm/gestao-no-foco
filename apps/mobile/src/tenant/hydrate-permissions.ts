import { fetchPermissions } from "@/api/mobile-api";
import { logger } from "@/observability/logger";
import { mobileTelemetry } from "@/observability/telemetry";
import {
  loadPermissionsCache,
  savePermissionsCache,
} from "@/tenant/permissions-cache";
import { useTenantStore } from "@/tenant/context-store";

/**
 * Reidrata RBAC após restore de tenant (cold start / upgrade).
 * - Cache primeiro (tabs não somem)
 * - Fetch online quando possível
 * Nunca grava [] em falha de API (evita esconder Dashboard/tabs).
 */
export async function hydrateTenantPermissions(input: {
  tenantId: string;
  online: boolean;
}): Promise<"ready" | "error" | "skipped"> {
  const { tenantId, online } = input;
  if (!tenantId) return "skipped";

  const store = useTenantStore.getState();
  store.beginPermissionsHydration();

  const cached = await loadPermissionsCache(tenantId);
  if (cached && cached.length > 0) {
    store.applyPermissions(cached, { source: "cache" });
    mobileTelemetry.track("RBAC_LOADED", {
      reason: `cache:${cached.length}`,
    });
  }

  if (!online) {
    if (cached && cached.length > 0) {
      store.markPermissionsReady();
      return "ready";
    }
    store.markPermissionsError("offline_no_cache");
    logger.warn("rbac.hydrate_offline_empty", {});
    return "error";
  }

  const result = await fetchPermissions(tenantId);
  if (!result.ok) {
    logger.warn("rbac.hydrate_failed", {
      status: result.status,
      code: result.error.code,
      hadCache: Boolean(cached?.length),
    });
    mobileTelemetry.track("RBAC_HYDRATE_FAILED", {
      reason: result.error.code,
    });
    if (cached && cached.length > 0) {
      // Mantém cache — não esconde Dashboard por falha transitória.
      store.markPermissionsReady();
      return "ready";
    }
    store.markPermissionsError(result.error.code);
    return "error";
  }

  store.applyPermissions(result.data.permissions, { source: "network" });
  store.markPermissionsReady();
  await savePermissionsCache(tenantId, result.data.permissions);
  mobileTelemetry.track("RBAC_LOADED", {
    reason: `hydrate:${result.data.permissions.length}`,
  });
  return "ready";
}
