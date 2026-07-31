/**
 * Sprint 25.7.4 — Mapeamento membership legado → papéis Enterprise (elevados).
 * Fonte única para Owner/Admin. Domínios podem estender manager/member.
 */

import type { TenantRole } from "../constants.ts";

/** Owner/Admin do tenant_members → papéis canónicos do catálogo RBAC. */
export const ELEVATED_MEMBERSHIP_TO_ENTERPRISE_ROLES: Readonly<
  Record<"owner" | "admin", readonly string[]>
> = {
  owner: ["proprietario"],
  admin: ["diretor"],
};

export function mapElevatedMembershipToEnterpriseRoles(
  membershipRole: string | null | undefined,
): string[] {
  if (!membershipRole?.trim()) return [];
  const key = membershipRole.trim();
  if (key === "owner" || key === "admin") {
    return [...ELEVATED_MEMBERSHIP_TO_ENTERPRISE_ROLES[key]];
  }
  return [];
}

export function isElevatedMembershipRole(
  membershipRole: string | null | undefined,
): boolean {
  const key = membershipRole?.trim() as TenantRole | undefined;
  return key === "owner" || key === "admin";
}
