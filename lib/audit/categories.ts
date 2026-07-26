/**
 * Sprint 21.2 — Categorias de auditoria.
 */

export const AUDIT_CATEGORIES = [
  "Authentication",
  "Users",
  "Security",
  "Finance",
  "Inventory",
  "Sales",
  "CRM",
  "Orders",
  "Reports",
  "Dashboard",
  "Configuration",
  "System",
] as const;

export type AuditCategoryId = (typeof AUDIT_CATEGORIES)[number];

export type AuditCategoryMeta = {
  id: AuditCategoryId;
  label: string;
  description: string;
};

export const AUDIT_CATEGORY_CATALOG: readonly AuditCategoryMeta[] = [
  { id: "Authentication", label: "Autenticação", description: "Login, logout e sessão" },
  { id: "Users", label: "Usuários", description: "Ciclo de vida de usuários" },
  { id: "Security", label: "Segurança", description: "RBAC, papéis e permissões" },
  { id: "Finance", label: "Financeiro", description: "Lançamentos e pagamentos" },
  { id: "Inventory", label: "Estoque e compras", description: "Estoque, compras e inventário" },
  { id: "Sales", label: "Vendas", description: "Operações comerciais" },
  { id: "CRM", label: "CRM", description: "Relacionamento com clientes" },
  { id: "Orders", label: "Ordens de serviço", description: "OS e oficina" },
  { id: "Reports", label: "Relatórios", description: "Exportações e relatórios" },
  { id: "Dashboard", label: "Dashboard", description: "Dashboards e ações executivas" },
  { id: "Configuration", label: "Configurações", description: "Configurações do tenant" },
  { id: "System", label: "Sistema", description: "Eventos internos do sistema" },
] as const;

export const AUDIT_CATEGORY_BY_ID: ReadonlyMap<string, AuditCategoryMeta> =
  new Map(AUDIT_CATEGORY_CATALOG.map((c) => [c.id, c]));

export function isKnownAuditCategory(id: string): id is AuditCategoryId {
  return AUDIT_CATEGORY_BY_ID.has(id);
}

export function getAuditCategory(id: string): AuditCategoryMeta | undefined {
  return AUDIT_CATEGORY_BY_ID.get(id);
}

export function listAuditCategories(): readonly AuditCategoryMeta[] {
  return AUDIT_CATEGORY_CATALOG;
}
