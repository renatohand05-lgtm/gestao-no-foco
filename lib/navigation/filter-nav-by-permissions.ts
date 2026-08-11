/**
 * Sprint 33.1 — filtro UX da sidebar. Não substitui guards de página/API/RLS.
 */
import { hasAnyPermission } from "@gof/rbac-contracts";
import { getPermissionsForRoles } from "@/lib/rbac/role-permissions";
import { mapMembershipRoleToEnterpriseRoles } from "@/lib/finance/shared/rbac-compat";
import type { NavItem } from "@/config/navigation";

export function resolveNavPermissions(input: {
  membershipRole?: string | null;
  snapshotRoles?: readonly string[] | null;
  snapshotPermissions?: readonly string[] | null;
}): string[] {
  const membershipRoles = mapMembershipRoleToEnterpriseRoles(
    input.membershipRole,
  );
  const roles = [
    ...new Set([...(input.snapshotRoles ?? []), ...membershipRoles]),
  ].filter(Boolean);
  const set = new Set(
    (input.snapshotPermissions ?? []).filter(Boolean) as string[],
  );
  if (set.size === 0) {
    for (const p of getPermissionsForRoles(roles)) set.add(p);
  } else {
    for (const p of getPermissionsForRoles(membershipRoles)) set.add(p);
  }
  return [...set];
}

export function filterNavByPermissions(
  items: NavItem[],
  permissions: readonly string[],
): NavItem[] {
  return items.filter((item) => {
    const need = item.requiredAnyPermissions;
    if (!need?.length) return true;
    return hasAnyPermission(permissions, need);
  });
}
