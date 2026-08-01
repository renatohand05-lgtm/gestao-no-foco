/**
 * Sprint 26.10 — Cache tributário com isolamento por tenant/vigência.
 */

type CacheEntry<T> = {
  tenantId: string;
  ruleId: string;
  version: number;
  validFrom: string;
  value: T;
  at: number;
};

const CACHE = new Map<string, CacheEntry<unknown>>();

function key(
  tenantId: string,
  ruleId: string,
  version: number,
  validFrom: string,
): string {
  return `${tenantId}::${ruleId}::${version}::${validFrom}`;
}

export function getTaxRuleCache<T>(
  tenantId: string,
  ruleId: string,
  version: number,
  validFrom: string,
): T | null {
  const k = key(tenantId, ruleId, version, validFrom);
  const hit = CACHE.get(k);
  if (!hit) return null;
  if (hit.tenantId !== tenantId) return null;
  if (hit.validFrom !== validFrom || hit.version !== version) return null;
  return hit.value as T;
}

export function setTaxRuleCache<T>(
  tenantId: string,
  ruleId: string,
  version: number,
  validFrom: string,
  value: T,
): void {
  CACHE.set(key(tenantId, ruleId, version, validFrom), {
    tenantId,
    ruleId,
    version,
    validFrom,
    value,
    at: Date.now(),
  });
}

export function invalidateTaxRuleCacheOnPublish(
  tenantId: string,
  ruleId: string,
): void {
  for (const [k, v] of CACHE) {
    if (v.tenantId === tenantId && v.ruleId === ruleId) CACHE.delete(k);
  }
}

export function assertCacheTenantIsolation(
  entryTenant: string,
  requestTenant: string,
): boolean {
  return entryTenant === requestTenant;
}

export function clearTaxCache(): void {
  CACHE.clear();
}
