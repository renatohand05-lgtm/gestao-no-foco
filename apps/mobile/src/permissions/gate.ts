import { hasPermission, hasAnyPermission, hasAllPermissions } from "@gof/rbac-contracts";
import { useTenantStore } from "@/tenant/context-store";

export { hasPermission, hasAnyPermission, hasAllPermissions };

export function usePermissions(): readonly string[] {
  return useTenantStore((s) => s.permissions);
}

export function useHasPermission(required: string): boolean {
  const permissions = usePermissions();
  return hasPermission(permissions, required);
}

export function useHasAnyPermission(required: readonly string[]): boolean {
  const permissions = usePermissions();
  return hasAnyPermission(permissions, required);
}

export function useHasAllPermissions(required: readonly string[]): boolean {
  const permissions = usePermissions();
  return hasAllPermissions(permissions, required);
}
