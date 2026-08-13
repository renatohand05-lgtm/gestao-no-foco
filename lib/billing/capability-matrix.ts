/**
 * Matriz técnica das capacidades existentes.
 * NÃO inventa diferenças comerciais entre Essencial/Gestão/Pro/Pro Plus.
 */

export type CapabilityClass =
  | "CORE"
  | "possible_entitlement"
  | "administrative"
  | "security"
  | "billing"
  | "consulting_human"
  | "not_plan_applicable";

export type CapabilityRow = {
  id: string;
  label: string;
  classification: CapabilityClass;
  note?: string;
};

export const EXISTING_CAPABILITY_MATRIX: readonly CapabilityRow[] = [
  { id: "ops-center", label: "Centro de operações", classification: "CORE" },
  { id: "dashboard", label: "Dashboard", classification: "CORE" },
  { id: "search", label: "Busca", classification: "CORE" },
  { id: "clients", label: "Clientes", classification: "CORE" },
  { id: "products", label: "Produtos & Serviços", classification: "CORE" },
  { id: "inventory", label: "Estoque", classification: "CORE" },
  { id: "purchases", label: "Compras", classification: "CORE" },
  { id: "sales", label: "Vendas", classification: "CORE" },
  { id: "work-orders", label: "Ordens de serviço", classification: "CORE" },
  { id: "agenda", label: "Agenda", classification: "CORE" },
  { id: "mechanics", label: "Equipe operacional / mecânicos", classification: "CORE" },
  { id: "finance", label: "Financeiro", classification: "CORE" },
  { id: "crm", label: "CRM", classification: "possible_entitlement" },
  { id: "intelligence-hub", label: "Inteligência / copiloto", classification: "possible_entitlement" },
  { id: "tax-hub", label: "Tributário", classification: "possible_entitlement" },
  { id: "analytics", label: "Analytics / BI", classification: "possible_entitlement" },
  { id: "analytics-reports", label: "Relatórios", classification: "possible_entitlement" },
  { id: "integrations", label: "Integrações", classification: "possible_entitlement" },
  { id: "automacoes", label: "Automações", classification: "possible_entitlement" },
  { id: "equipe", label: "Equipe / papéis", classification: "administrative" },
  { id: "settings", label: "Configurações", classification: "administrative" },
  { id: "rbac", label: "RBAC / permissões", classification: "security" },
  { id: "rls", label: "RLS / tenant isolation", classification: "security" },
  { id: "billing", label: "Assinatura / checkout", classification: "billing" },
  {
    id: "consulting",
    label: "Consultoria humana (Pro Plus)",
    classification: "consulting_human",
    note: "Não automatizada. Flag includesConsulting apenas.",
  },
  { id: "mobile", label: "App mobile", classification: "not_plan_applicable" },
] as const;
