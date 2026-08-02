/**
 * Sprint 30.2 — Guards puros de domínio: proteção do último proprietário
 * e isolamento por tenant. Sem I/O — usados pelos services e testáveis
 * isoladamente (sem banco).
 */

import type { MemberStatus, TeamMember } from "./types.ts";

type OwnerLike = Pick<TeamMember, "id" | "role" | "status">;

export function countActiveOwners(members: readonly OwnerLike[]): number {
  return members.filter(
    (m) => m.role === "owner" && (m.status ?? "active") !== "inactive",
  ).length;
}

/** true quando o membro é o único owner ativo restante (não pode perder o papel/acesso). */
export function isLastActiveOwner(
  members: readonly OwnerLike[],
  memberId: string,
): boolean {
  const target = members.find((m) => m.id === memberId);
  if (!target || target.role !== "owner") return false;
  if ((target.status ?? "active") === "inactive") return false;
  return countActiveOwners(members) <= 1;
}

export function assertCanChangeRole(
  members: readonly OwnerLike[],
  memberId: string,
  nextRole: string,
): void {
  if (nextRole === "owner") return;
  if (isLastActiveOwner(members, memberId)) {
    throw new Error(
      "Não é possível alterar o papel do único proprietário ativo do tenant.",
    );
  }
}

export function assertCanDeactivate(
  members: readonly OwnerLike[],
  memberId: string,
): void {
  if (isLastActiveOwner(members, memberId)) {
    throw new Error(
      "Não é possível inativar o único proprietário ativo do tenant.",
    );
  }
}

export function assertCanRemoveAccess(
  members: readonly OwnerLike[],
  memberId: string,
): void {
  if (isLastActiveOwner(members, memberId)) {
    throw new Error(
      "Não é possível remover o acesso do único proprietário ativo do tenant.",
    );
  }
}

export function nextMemberStatus(current: MemberStatus): MemberStatus {
  return current === "active" ? "inactive" : "active";
}

/** Isolamento multi-tenant — recurso precisa pertencer ao tenant esperado. */
export function belongsToTenant(
  resourceTenantId: string | null | undefined,
  expectedTenantId: string,
): boolean {
  return Boolean(resourceTenantId) && resourceTenantId === expectedTenantId;
}

export function assertTenantMatch(
  resourceTenantId: string | null | undefined,
  expectedTenantId: string,
  message = "Registro pertence a outro tenant.",
): void {
  if (!belongsToTenant(resourceTenantId, expectedTenantId)) {
    throw new Error(message);
  }
}
