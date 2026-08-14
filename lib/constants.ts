export const APP_ROUTES = {
  home: "/",
  login: "/login",
  register: "/register",
  onboarding: "/onboarding",
  dashboard: (tenant: string) => `/${tenant}/dashboard`,
} as const;

/** Rotas de auth que redirecionam usuário já logado para o app. */
export const AUTH_ROUTES = ["/login", "/register", "/recuperar"] as const;

/** Rotas públicas (sem login). Inclui inspeção pública e manutenção. */
export const PUBLIC_ROUTES = [
  "/",
  ...AUTH_ROUTES,
  "/nova-senha",
  "/inspecao",
  "/manutencao",
] as const;

/** Endpoints operacionais liberados sem sessão. */
export const OPERATIONAL_API_ROUTES = ["/api/health", "/api/status"] as const;

export const TENANT_ROLES = ["owner", "admin", "manager", "member"] as const;

export type TenantRole = (typeof TENANT_ROLES)[number];
