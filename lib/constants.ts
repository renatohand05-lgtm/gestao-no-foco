export const APP_ROUTES = {
  home: "/",
  login: "/login",
  register: "/register",
  onboarding: "/onboarding",
  dashboard: (tenant: string) => `/${tenant}/dashboard`,
} as const;

export const AUTH_ROUTES = ["/login", "/register"] as const;

export const PUBLIC_ROUTES = ["/", ...AUTH_ROUTES] as const;

export const TENANT_ROLES = ["owner", "admin", "manager", "member"] as const;

export type TenantRole = (typeof TENANT_ROLES)[number];
