/**
 * Limpeza de caches client tenant-scoped ao trocar de empresa.
 */
export function clearTenantScopedClientCaches(previousSlug?: string | null) {
  if (typeof window === "undefined") return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const k = window.localStorage.key(i);
      if (!k) continue;
      if (k.startsWith("gnf:dashboard-filters")) keys.push(k);
      if (previousSlug && k.includes(`:${previousSlug}`)) keys.push(k);
    }
    for (const k of new Set(keys)) {
      window.localStorage.removeItem(k);
    }
    // Legacy unscoped key (pré-33.2)
    window.localStorage.removeItem("gnf:dashboard-filters");
  } catch {
    /* ignore */
  }
}
