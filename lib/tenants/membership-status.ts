/**
 * Sprint 34.2 — Membership ativa (web + mobile).
 * status null = legado pré-30.2, tratado como ativo.
 */

export type MembershipStatusRow = {
  status?: string | null;
  deactivated_at?: string | null;
};

export function isActiveMembershipRow(row: MembershipStatusRow): boolean {
  if (row.deactivated_at) return false;
  if (row.status != null && row.status !== "active") return false;
  return true;
}
