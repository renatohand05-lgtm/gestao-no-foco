/**
 * Sprint 21.1 — Tipos centrais do RBAC Enterprise.
 * Domínio puro · sem React · sem provedor de autenticação.
 */

/** Papel atribuído a um usuário (sistema ou personalizado). */
export type Role = {
  id: string;
  name: string;
  description: string;
  /** Hierarquia relativa (maior = mais privilegiado). */
  level: number;
  /** Escopo operacional do papel. */
  scope: RoleScope;
  /** Sistema (imutável) vs personalizado (futuro). */
  type: RoleType;
};

export type RoleScope = "platform" | "tenant" | "module";
export type RoleType = "system" | "custom";

/** Metadados de uma permissão do catálogo. */
export type Permission = {
  key: string;
  module: PermissionModule;
  action: string;
  description: string;
  category: PermissionCategory;
  risk: PermissionRisk;
};

export type PermissionModule =
  | "financeiro"
  | "estoque"
  | "compras"
  | "vendas"
  | "os"
  | "crm"
  | "agenda"
  | "dashboard"
  | "analytics"
  | "inteligencia"
  | "tax"
  | "usuarios"
  | "configuracoes"
  | "auditoria"
  | "relatorios";

export type PermissionCategory =
  | "leitura"
  | "escrita"
  | "aprovacao"
  | "exclusao"
  | "exportacao"
  | "administracao"
  | "financeiro_sensivel"
  | "dados_sensiveis";

export type PermissionRisk = "baixo" | "medio" | "alto" | "critico";

/**
 * Contexto de autorização do usuário em um tenant.
 * Desacoplado do provedor de autenticação.
 */
export type UserAuthorizationContext = {
  userId: string;
  /** Tenant ativo. Ausente ⇒ negação segura (salvo platformScope). */
  tenantId: string | null;
  roles: ReadonlyArray<string>;
  additionalPermissions?: ReadonlyArray<string>;
  deniedPermissions?: ReadonlyArray<string>;
  /**
   * Quando true e o usuário possui `super_admin`,
   * permite operações cross-tenant / sem tenantId.
   */
  platformScope?: boolean;
};

/** Alias explícito para clareza multi-tenant. */
export type TenantAuthorizationContext = UserAuthorizationContext & {
  tenantId: string;
};

/** Motivos estáveis de decisão (não expor na UI). */
export type AuthorizationReason =
  | "ALLOWED_ROLE"
  | "ALLOWED_ADDITIONAL"
  | "ALLOWED_PLATFORM"
  | "EXPLICIT_DENY"
  | "POLICY_DENIED"
  | "DENY_BY_DEFAULT"
  | "UNKNOWN_PERMISSION"
  | "INVALID_CONTEXT"
  | "MISSING_TENANT"
  | "TENANT_MISMATCH"
  | "ROLE_REQUIRED"
  | "EMPTY_REQUIREMENT";

export type AuthorizationDecision = {
  allowed: boolean;
  reason: AuthorizationReason;
  permission: string | null;
  userId: string | null;
  tenantId: string | null;
  /** Mensagem segura para logs/UI (sem regras internas). */
  message: string;
};

/** Opções de avaliação contextual. */
export type AuthorizeOptions = {
  /** Tenant do recurso alvo (isolamento multiempresa). */
  resourceTenantId?: string | null;
  /** Política contextual adicional a aplicar. */
  policyIds?: ReadonlyArray<string>;
};

/** Política composta / contextual. */
export type Policy = {
  id: string;
  name: string;
  description: string;
  /**
   * Retorna true se a política permite seguir;
   * false para negar; null para não opinar.
   */
  evaluate: (
    context: UserAuthorizationContext,
    permission: string,
    options?: AuthorizeOptions,
  ) => boolean | null;
};

/** Conjunto de capacidades efetivas do usuário. */
export type Ability = {
  userId: string;
  tenantId: string | null;
  roles: ReadonlyArray<string>;
  granted: ReadonlySet<string>;
  denied: ReadonlySet<string>;
  platformScope: boolean;
};

export type PermissionCheckInput = string | ReadonlyArray<string>;
