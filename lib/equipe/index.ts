/**
 * Sprint 30.2 — Equipe · API pública client-safe.
 * Services, page-auth, schema-probe, audit e token ficam em `./server`
 * (ou imports diretos) para não puxar `server-only` / `node:crypto` no client.
 */

export type {
  CreateInvitationInput,
  CreateInvitationResult,
  EquipeSchemaProbe,
  Invitation,
  InvitationStatus,
  JobTitle,
  JobTitleStatus,
  MemberStatus,
  MembershipRole,
  RolesMatrix,
  RolesMatrixEntry,
  RolesMatrixModule,
  RolesMatrixRole,
  Team,
  TeamAuditEvent,
  TeamMember,
  TeamMemberProfile,
  TeamStatus,
} from "./types";

export {
  getDepartmentPresets,
  INVITATION_STATUS_LABELS,
  invitationStatusLabel,
  JOB_TITLE_STATUS_LABELS,
  jobTitleStatusLabel,
  MEMBER_STATUS_LABELS,
  MEMBERSHIP_ROLE_DESCRIPTIONS,
  MEMBERSHIP_ROLE_LABELS,
  MEMBERSHIP_ROLE_OPTIONS,
  memberStatusLabel,
  membershipRoleLabel,
  TEAM_STATUS_LABELS,
  teamStatusLabel,
} from "./labels";

export {
  assertCanChangeRole,
  assertCanDeactivate,
  assertCanRemoveAccess,
  assertTenantMatch,
  belongsToTenant,
  countActiveOwners,
  isLastActiveOwner,
  nextMemberStatus,
} from "./guards";

export {
  buildRolesMatrix,
  countModulesInMatrix,
  countPermissionsInMatrix,
  findRoleInMatrix,
  membershipRoleToEnterpriseRoles,
} from "./roles-matrix";
