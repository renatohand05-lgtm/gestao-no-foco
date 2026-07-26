/**
 * Sprint 21.1 — RBAC Enterprise · API pública.
 * Domínio puro · sem React · desacoplado de autenticação.
 */

export type {
  Ability,
  AuthorizationDecision,
  AuthorizationReason,
  AuthorizeOptions,
  Permission,
  PermissionCategory,
  PermissionCheckInput,
  PermissionModule,
  PermissionRisk,
  Policy,
  Role,
  RoleScope,
  RoleType,
  TenantAuthorizationContext,
  UserAuthorizationContext,
} from "./types.ts";

export {
  ALL_PERMISSION_KEYS,
  getPermission,
  isKnownPermission,
  listPermissionsByModule,
  P,
  PERMISSION_BY_KEY,
  PERMISSION_CATALOG,
  PERMISSIONS_BY_MODULE,
  type PermissionKey,
} from "./permissions.ts";

export {
  compareRoleLevel,
  getRole,
  isSystemRole,
  listSystemRoles,
  ROLE_BY_ID,
  SYSTEM_ROLE_IDS,
  SYSTEM_ROLES,
  type RoleId,
} from "./roles.ts";

export {
  getPermissionsForRole,
  getPermissionsForRoles,
  PLATFORM_ONLY_PERMISSIONS,
  ROLE_PERMISSIONS,
  roleHasPermission,
} from "./role-permissions.ts";

export {
  DEFAULT_POLICIES,
  evaluatePolicies,
  noDestructiveForReadRolesPolicy,
  ownerOrDirectorApprovalPolicy,
  POLICY_BY_ID,
  requireTenantPolicy,
  resolvePolicies,
  tenantIsolationPolicy,
} from "./policies.ts";

export {
  abilityAllows,
  createAbility,
  mergeAbilities,
} from "./abilities.ts";

export {
  authorize,
  can,
  cannot,
  explainAuthorization,
  hasAllPermissions,
  hasAllRoles,
  hasAnyPermission,
  hasAnyRole,
  hasRole,
  roleGrantsPermission,
} from "./authorization.ts";

export {
  assertPermission,
  checkAllPermissions,
  checkPermission,
  requireAllPermissions,
  requireAllRoles,
  requireAnyPermission,
  requireAnyRole,
  requirePermission,
  requireRole,
} from "./guards.ts";

export {
  createAuthorizationContext,
  isValidAuthorizationContext,
  withPlatformScope,
  withTenant,
  type CreateAuthContextInput,
} from "./context.ts";

export {
  AccessDeniedError,
  AUTH_ERROR_CODES,
  AuthorizationError,
  isAccessDeniedError,
  isAuthorizationError,
  safeAuthMessage,
  type AuthErrorCode,
} from "./errors.ts";
