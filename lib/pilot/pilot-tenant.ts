/**
 * Marcação de tenant piloto — sem bypass de segurança.
 * Pilotos usam RLS/RBAC/API/production reais.
 */
export const PILOT_TENANT_FLAG_KEY = "pilot";

export type TenantPilotMeta = {
  isPilot: boolean;
  label?: string;
};

/**
 * Lê flag opcional em tenants.settings / metadata JSON se existir no futuro.
 * Hoje: permite lista via env PILOT_TENANT_SLUGS (csv), sem alterar RLS.
 */
export function resolvePilotTenant(input: {
  slug: string;
  settings?: Record<string, unknown> | null;
}): TenantPilotMeta {
  const fromSettings =
    input.settings?.[PILOT_TENANT_FLAG_KEY] === true ||
    input.settings?.is_pilot === true;

  const envList = (process.env.PILOT_TENANT_SLUGS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const fromEnv = envList.includes(input.slug.trim().toLowerCase());

  if (fromSettings || fromEnv) {
    return { isPilot: true, label: "piloto" };
  }

  return { isPilot: false };
}
