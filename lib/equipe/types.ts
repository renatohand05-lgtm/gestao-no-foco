/**
 * Sprint 30.2 — Equipe (Membros, Convites, Equipes, Cargos, Papéis, Auditoria).
 * Domínio puro — sem import de Supabase/Next. Seguro para uso em testes Node.
 */

import type { TenantRole } from "../constants.ts";

export type MembershipRole = TenantRole;

export type MemberStatus = "active" | "inactive";
export type TeamStatus = "active" | "inactive" | "archived";
export type JobTitleStatus = "active" | "inactive";
export type InvitationStatus = "pending" | "accepted" | "expired" | "cancelled";

export type TeamMemberProfile = {
  fullName: string | null;
  email: string | null;
  avatarUrl: string | null;
};

export type TeamMember = {
  id: string;
  tenantId: string;
  userId: string;
  role: MembershipRole;
  status: MemberStatus;
  teamId: string | null;
  jobTitleId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string | null;
  deactivatedAt: string | null;
  profile: TeamMemberProfile;
};

export type Team = {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  area: string | null;
  status: TeamStatus;
  leaderUserId: string | null;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};

export type JobTitle = {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  level: number | null;
  teamId: string | null;
  defaultMembershipRole: MembershipRole | null;
  status: JobTitleStatus;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
};

export type Invitation = {
  id: string;
  tenantId: string;
  email: string;
  fullName: string | null;
  membershipRole: MembershipRole;
  teamId: string | null;
  jobTitleId: string | null;
  tokenPrefix: string;
  status: InvitationStatus;
  expiresAt: string;
  message: string | null;
  invitedBy: string | null;
  acceptedAt: string | null;
  acceptedUserId: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  resentAt: string | null;
};

export type CreateInvitationInput = {
  email: string;
  fullName?: string | null;
  membershipRole: MembershipRole;
  teamId?: string | null;
  jobTitleId?: string | null;
  message?: string | null;
  validadeHoras?: number;
};

export type CreateInvitationResult = {
  invitation: Invitation;
  /** Retornado apenas uma vez, no momento da criação/reenvio. */
  inviteUrl: string;
  token: string;
  emailSent: boolean;
};

export type RolesMatrixRole = {
  id: string;
  name: string;
  description: string;
  level: number;
  scope: string;
};

export type RolesMatrixEntry = {
  permissionKey: string;
  action: string;
  description: string;
  category: string;
  risk: string;
  rolesGranting: readonly string[];
};

export type RolesMatrixModule = {
  module: string;
  entries: RolesMatrixEntry[];
};

export type RolesMatrix = {
  roles: RolesMatrixRole[];
  modules: RolesMatrixModule[];
};

export type TeamAuditEvent = {
  id: string;
  event: string;
  description: string | null;
  actorUserId: string | null;
  targetType: string | null;
  targetId: string | null;
  createdAt: string;
  metadata: Record<string, unknown>;
};

export type EquipeSchemaProbe = {
  hasTeams: boolean;
  hasTeamMembers: boolean;
  hasJobTitles: boolean;
  hasInvitations: boolean;
  hasMemberStatusColumns: boolean;
  ready: boolean;
  missing: string[];
  message: string;
};
