export const APP_ROUTES = {
  home: "/",
  login: "/login",
  register: "/register",
  onboarding: "/onboarding",
  dashboard: (tenant: string) => `/${tenant}/dashboard`,
} as const;

export const AUTH_ROUTES = ["/login", "/register"] as const;

/** Rotas públicas (sem login). Inclui inspeção pública e manutenção. */
export const PUBLIC_ROUTES = [
  "/",
  ...AUTH_ROUTES,
  "/inspecao",
  "/manutencao",
] as const;

/** Endpoints operacionais liberados sem sessão. */
export const OPERATIONAL_API_ROUTES = ["/api/health", "/api/status"] as const;

export const TENANT_ROLES = ["owner", "admin", "manager", "member"] as const;

export type TenantRole = (typeof TENANT_ROLES)[number];
