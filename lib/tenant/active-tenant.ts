/**
 * Preferência de empresa ativa (somente slug autorizado).
 * Cookie http-readable; cold start restaura se membership ainda válida.
 */
export const LAST_TENANT_COOKIE = "gof_last_tenant_slug";

export function pickPreferredTenantSlug(
  authorizedSlugs: readonly string[],
  preferred?: string | null,
): string | null {
  if (!authorizedSlugs.length) return null;
  const pref = preferred?.trim();
  if (pref && authorizedSlugs.includes(pref)) return pref;
  return authorizedSlugs[0] ?? null;
}

export function buildLastTenantCookie(slug: string): string {
  const safe = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
  const maxAge = 60 * 60 * 24 * 180;
  return `${LAST_TENANT_COOKIE}=${encodeURIComponent(safe)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}
