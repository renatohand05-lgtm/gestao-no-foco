/**
 * Sprint 30.2 — Equipe · API server-only (páginas RSC / server actions internas).
 * Não importar de Client Components.
 */

import "server-only";

export {
  EQUIPE_TABLES,
  equipeSchemaUnavailableError,
  probeEquipeSchema,
  type EquipeTable,
} from "./schema-probe";

export {
  EQUIPE_ERROR_CODES,
  EquipeError,
  assertEquipeAdmin,
  equipePageAuthError,
  requireEquipePageAuth,
  resolveEquipePageAuth,
  tryRequireEquipePageAuth,
  type EquipeErrorCode,
  type EquipePageAuth,
} from "./page-auth";

export {
  getMember,
  isMembersServiceDegraded,
  listMembers,
  removeMemberAccess,
  setMemberStatus,
  updateMemberAssignments,
  updateMemberRole,
} from "./members-service";

export {
  acceptInvitation,
  cancelInvitation,
  createInvitation,
  emailProviderConfigured,
  getInvitationByToken,
  listInvitations,
  resendInvitation,
} from "./invitations-service";

export {
  addTeamMember,
  createTeam,
  listTeams,
  removeTeamMember,
  setTeamStatus,
  updateTeam,
} from "./teams-service";

export {
  createJobTitle,
  listJobTitles,
  setJobTitleStatus,
  updateJobTitle,
} from "./job-titles-service";

export {
  EQUIPE_AUDIT_MODULE,
  listTeamAuditEvents,
  recordTeamAuditEvent,
  type TeamAuditEventCode,
} from "./audit";

export {
  buildInviteUrlPath,
  generateInviteToken,
  hashInviteToken,
  inviteTokenPrefix,
} from "./token";

export {
  buildRolesMatrix,
  countModulesInMatrix,
  countPermissionsInMatrix,
  findRoleInMatrix,
  membershipRoleToEnterpriseRoles,
} from "./roles-matrix";
