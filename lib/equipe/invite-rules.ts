/**
 * Regras puras de convite (sem I/O) — testáveis em Node.
 */

import { TENANT_ROLES, type TenantRole } from "../constants.ts";

/** Papéis convidáveis: nunca owner (transferência de propriedade é fluxo dedicado). */
export const INVITABLE_ROLES = TENANT_ROLES.filter(
  (role): role is Exclude<TenantRole, "owner"> => role !== "owner",
);

export function isInvitableRole(role: string): role is Exclude<TenantRole, "owner"> {
  return (INVITABLE_ROLES as readonly string[]).includes(role);
}

export function assertInvitableRole(role: string): Exclude<TenantRole, "owner"> {
  if (role === "owner") {
    throw new Error(
      "Não é permitido convidar como Proprietário. Transfira a propriedade por fluxo dedicado.",
    );
  }
  if (!isInvitableRole(role)) {
    throw new Error("Papel de convite inválido.");
  }
  return role;
}

export function normalizeInviteEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidInviteEmail(email: string): boolean {
  const normalized = normalizeInviteEmail(email);
  return Boolean(normalized) && normalized.includes("@") && !normalized.includes(" ");
}
