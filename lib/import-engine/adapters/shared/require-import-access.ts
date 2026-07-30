/**
 * Sprint 22.5.1 — Gate de acesso genérico para os wizards de importação de
 * Vendas e Ordens de Serviço.
 *
 * Nota de arquitetura: o adapter declara `requiredPermission` (ex.:
 * "vendas.criar", "os.criar") alinhado ao catálogo RBAC (`lib/rbac`). A
 * verificação completa via snapshot de autorização (como o Financeiro faz em
 * `lib/finance/page-auth.ts`) depende de tabelas RBAC específicas do tenant;
 * aqui usamos o papel do tenant (`tenant_members.role`) como salvaguarda
 * imediata e documentamos a integração fina como próximo passo — sem
 * inventar regra de negócio nova.
 */
import { getCurrentProfile } from "@/lib/auth/session";
import { requireTenant } from "@/lib/tenants";
import type { TenantWithRole } from "@/types";

import type { ModuleImportAdapter } from "./module-adapter.ts";

export type ImportModuleAccess = {
  tenant: TenantWithRole;
  profile: { id: string; email: string; name: string | null };
};

/** Papéis que, por padrão, podem criar registos no tenant (import inclusive). */
const ROLES_ALLOWED_TO_CREATE = new Set(["owner", "admin", "manager"]);

/** Verificação sem throw — útil para decidir o que renderizar numa página. */
export function canAccessModuleImport(
  tenant: Pick<TenantWithRole, "role">,
): boolean {
  return ROLES_ALLOWED_TO_CREATE.has(tenant.role);
}

export async function requireModuleImportAccess(
  tenantSlug: string,
  adapter: ModuleImportAdapter,
): Promise<ImportModuleAccess> {
  const tenant = await requireTenant(tenantSlug);
  const profile = await getCurrentProfile();
  if (!profile?.id) {
    throw new Error("Sessão ausente.");
  }
  if (!ROLES_ALLOWED_TO_CREATE.has(tenant.role)) {
    throw new Error(
      `Sem permissão para importar dados em ${adapter.label} (${adapter.requiredPermission}).`,
    );
  }
  return { tenant, profile };
}
