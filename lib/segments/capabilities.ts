/**
 * Sprint 35.0/35.1 — Capabilities de produto (catálogo central).
 * Módulos consultam isto (não o nome do segmento).
 * RBAC continua sendo a autoridade de acesso.
 */

export const PRODUCT_CAPABILITIES = [
  "appointments",
  "customers",
  "vehicles",
  "work_orders",
  "workshop_mechanics",
  "professionals",
  "commissions",
  "inventory",
  "service_checklist",
  "recurring_services",
  "patient_records",
  "treatment_plans",
  "financial_management",
  "sales",
  "purchases",
  "crm",
  "catalog",
  "operations_board",
  "reports",
  "analytics",
  "integrations",
  "tax",
  "packages",
  "projects",
  "accounts_payable",
  "accounts_receivable",
] as const;

export type ProductCapability = (typeof PRODUCT_CAPABILITIES)[number];

/** Sinônimos 35.1 → id canônico (estável). */
export const CAPABILITY_ALIASES: Record<string, ProductCapability> = {
  services: "catalog",
  products: "catalog",
  finance: "financial_management",
  vehicle_checklist: "service_checklist",
  mechanics: "workshop_mechanics",
  agenda: "appointments",
};

export type CapabilityAvailability = "ui" | "backend" | "future";
export type ModuleStatusReal = "READY" | "REUSABLE" | "PARTIAL" | "MISSING";

export type CapabilityDef = {
  id: ProductCapability;
  label: string;
  description: string;
  navIds: readonly string[];
  href?: string;
  availability: CapabilityAvailability;
  overridable: boolean;
  essential: boolean;
  defaultStatus: ModuleStatusReal;
};

export const CAPABILITY_DEFS: readonly CapabilityDef[] = [
  {
    id: "customers",
    label: "Clientes",
    description: "Cadastro único de clientes/pacientes",
    navIds: ["clients"],
    href: "/clientes",
    availability: "backend",
    overridable: true,
    essential: false,
    defaultStatus: "READY",
  },
  {
    id: "crm",
    label: "CRM",
    description: "Pipeline, leads e relacionamento",
    navIds: ["crm"],
    href: "/crm",
    availability: "backend",
    overridable: true,
    essential: false,
    defaultStatus: "READY",
  },
  {
    id: "catalog",
    label: "Catálogo",
    description: "Produtos e serviços (mesmo módulo)",
    navIds: ["products"],
    href: "/produtos",
    availability: "backend",
    overridable: true,
    essential: false,
    defaultStatus: "READY",
  },
  {
    id: "inventory",
    label: "Estoque",
    description: "Saldos e movimentações",
    navIds: ["inventory"],
    href: "/estoque",
    availability: "backend",
    overridable: true,
    essential: false,
    defaultStatus: "READY",
  },
  {
    id: "purchases",
    label: "Compras",
    description: "Pedidos de compra e supply",
    navIds: ["purchases"],
    href: "/compras",
    availability: "backend",
    overridable: true,
    essential: false,
    defaultStatus: "READY",
  },
  {
    id: "sales",
    label: "Vendas",
    description: "Pedidos e orçamentos",
    navIds: ["sales"],
    href: "/vendas",
    availability: "backend",
    overridable: true,
    essential: false,
    defaultStatus: "READY",
  },
  {
    id: "financial_management",
    label: "Financeiro",
    description: "Fluxo, contas a pagar/receber e DRE",
    navIds: ["finance"],
    href: "/financeiro",
    availability: "backend",
    overridable: true,
    essential: false,
    defaultStatus: "READY",
  },
  {
    id: "accounts_payable",
    label: "Contas a pagar",
    description: "Parte do módulo Financeiro (34.9)",
    navIds: ["finance"],
    href: "/financeiro/contas-pagar",
    availability: "backend",
    overridable: false,
    essential: false,
    defaultStatus: "READY",
  },
  {
    id: "accounts_receivable",
    label: "Contas a receber",
    description: "Parte do módulo Financeiro",
    navIds: ["finance"],
    href: "/financeiro/contas-receber",
    availability: "backend",
    overridable: false,
    essential: false,
    defaultStatus: "READY",
  },
  {
    id: "appointments",
    label: "Agenda",
    description: "Agenda operacional e comercial",
    navIds: ["agenda"],
    href: "/agenda",
    availability: "backend",
    overridable: true,
    essential: false,
    defaultStatus: "READY",
  },
  {
    id: "professionals",
    label: "Profissionais",
    description: "Reusa Equipe/mecânicos (mesmo cadastro)",
    navIds: ["mechanics"],
    href: "/oficina/mecanicos",
    availability: "backend",
    overridable: true,
    essential: false,
    defaultStatus: "REUSABLE",
  },
  {
    id: "workshop_mechanics",
    label: "Mecânicos",
    description: "Equipe técnica da oficina",
    navIds: ["mechanics"],
    href: "/oficina/mecanicos",
    availability: "backend",
    overridable: true,
    essential: false,
    defaultStatus: "READY",
  },
  {
    id: "vehicles",
    label: "Veículos",
    description: "Cadastro de veículos (infra oficina)",
    navIds: [],
    availability: "backend",
    overridable: true,
    essential: false,
    defaultStatus: "READY",
  },
  {
    id: "work_orders",
    label: "Ordens de serviço",
    description: "OS / atendimentos quando o módulo existir",
    navIds: ["work-orders"],
    href: "/ordens",
    availability: "backend",
    overridable: true,
    essential: false,
    defaultStatus: "READY",
  },
  {
    id: "service_checklist",
    label: "Checklist",
    description: "Checklist vinculado à OS existente",
    navIds: ["work-orders"],
    href: "/ordens",
    availability: "backend",
    overridable: true,
    essential: false,
    defaultStatus: "PARTIAL",
  },
  {
    id: "commissions",
    label: "Comissões",
    description: "Comissão de profissionais (já existe na oficina)",
    navIds: ["mechanics"],
    availability: "backend",
    overridable: true,
    essential: false,
    defaultStatus: "PARTIAL",
  },
  {
    id: "recurring_services",
    label: "Recorrência / pacotes",
    description: "Pacotes e recorrência — sem fidelidade completa",
    navIds: ["products"],
    availability: "ui",
    overridable: true,
    essential: false,
    defaultStatus: "PARTIAL",
  },
  {
    id: "packages",
    label: "Pacotes",
    description: "Alias de recorrência — sem módulo dedicado",
    navIds: ["products"],
    availability: "ui",
    overridable: true,
    essential: false,
    defaultStatus: "PARTIAL",
  },
  {
    id: "operations_board",
    label: "Centro de Operações",
    description: "Quadro ao vivo da operação",
    navIds: ["ops-center"],
    href: "/centro-operacoes",
    availability: "backend",
    overridable: true,
    essential: false,
    defaultStatus: "READY",
  },
  {
    id: "reports",
    label: "Relatórios",
    description: "Analytics / relatórios",
    navIds: ["analytics-reports"],
    href: "/analytics/relatorios",
    availability: "backend",
    overridable: true,
    essential: false,
    defaultStatus: "READY",
  },
  {
    id: "analytics",
    label: "Analytics / Inteligência",
    description: "BI e hub de inteligência",
    navIds: ["analytics", "intelligence-hub"],
    href: "/analytics",
    availability: "backend",
    overridable: true,
    essential: false,
    defaultStatus: "READY",
  },
  {
    id: "integrations",
    label: "Integrações",
    description: "Importação de arquivos (piloto honesto)",
    navIds: ["integrations"],
    href: "/integracoes/importar",
    availability: "backend",
    overridable: true,
    essential: false,
    defaultStatus: "PARTIAL",
  },
  {
    id: "tax",
    label: "Tributário",
    description: "Regras e cockpit fiscal",
    navIds: ["tax-hub"],
    href: "/tributario",
    availability: "backend",
    overridable: true,
    essential: false,
    defaultStatus: "READY",
  },
  {
    id: "projects",
    label: "Projetos",
    description: "Sem módulo dedicado — não inventar nesta sprint",
    navIds: [],
    availability: "future",
    overridable: false,
    essential: false,
    defaultStatus: "MISSING",
  },
  {
    id: "patient_records",
    label: "Prontuário",
    description: "Desligado. Sem dados de saúde nesta sprint.",
    navIds: [],
    availability: "future",
    overridable: false,
    essential: false,
    defaultStatus: "MISSING",
  },
  {
    id: "treatment_plans",
    label: "Plano de tratamento",
    description: "Desligado. Sem odontograma/plano clínico.",
    navIds: [],
    availability: "future",
    overridable: false,
    essential: false,
    defaultStatus: "MISSING",
  },
];

export const CAPABILITY_BY_ID: Record<ProductCapability, CapabilityDef> =
  Object.fromEntries(CAPABILITY_DEFS.map((d) => [d.id, d])) as Record<
    ProductCapability,
    CapabilityDef
  >;

export const FUTURE_CAPABILITIES: readonly ProductCapability[] = CAPABILITY_DEFS.filter(
  (d) => d.availability === "future",
).map((d) => d.id);

export const ESSENTIAL_NAV_IDS = ["dashboard", "search", "settings"] as const;

export function isProductCapability(
  value: string | null | undefined,
): value is ProductCapability {
  if (!value) return false;
  return (PRODUCT_CAPABILITIES as readonly string[]).includes(value);
}

export function canonicalizeCapability(
  value: string | null | undefined,
): ProductCapability | null {
  if (!value) return null;
  if (isProductCapability(value)) return value;
  return CAPABILITY_ALIASES[value] ?? null;
}

/** Capabilities sempre presentes no produto (relevância, não segurança). */
export const BASE_CAPABILITIES: readonly ProductCapability[] = [
  "customers",
  "financial_management",
  "reports",
  "catalog",
];
