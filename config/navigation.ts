import {
  Activity,
  BarChart3,
  Brain,
  CalendarDays,
  FileBarChart,
  Landmark,
  LayoutDashboard,
  Package,
  Plug,
  Search,
  Settings,
  ShoppingCart,
  Truck,
  Users,
  Wallet,
  Warehouse,
  Workflow,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import { getSegmentNavLabels } from "./segment-labels";
import { filterNavByCapabilities } from "../lib/segments/nav.ts";
import { resolveSegmentContext } from "../lib/segments/resolve.ts";

/**
 * Alinhado a lib/rbac/executive-access (EXECUTIVE_DASHBOARD_ANY_OF).
 * Strings literais — config não importa @/lib (testes Node / sidebar-core).
 */
export const NAV_ANALYTICS_EXECUTIVE_ANY_OF = [
  "analytics.executivo",
  "dashboard.executivo",
] as const;

export const NAV_ANALYTICS_VIEW_ANY_OF = [
  "analytics.visualizar",
  "analytics.executivo",
  "dashboard.executivo",
] as const;

export type NavGroupId =
  | "principal"
  | "operacao"
  | "inteligencia"
  | "sistema";

export type NavItem = {
  /** Identidade estável — usada como key React. */
  id: string;
  title: string;
  href: string;
  icon: LucideIcon;
  group: NavGroupId;
  description?: string;
  /**
   * Permissões any-of (fonte: lib/rbac/executive-access).
   * Metadata de alinhamento RBAC — o guard server-side é a autoridade.
   */
  requiredAnyPermissions?: readonly string[];
};

export const NAV_GROUP_LABEL: Record<NavGroupId, string> = {
  principal: "Principal",
  operacao: "Operação",
  inteligencia: "Inteligência",
  sistema: "Sistema",
};

export const NAV_GROUP_ORDER: readonly NavGroupId[] = [
  "principal",
  "operacao",
  "inteligencia",
  "sistema",
] as const;

export function getTenantNav(
  tenantSlug: string,
  segment?: string | null,
  options?: {
    segmentVersion?: number | null;
    segmentConfig?: unknown;
  },
): NavItem[] {
  const base = `/${tenantSlug}`;
  const segmentCtx = resolveSegmentContext({
    segment,
    segmentVersion: options?.segmentVersion,
    segmentConfig: options?.segmentConfig,
  });
  const labels = (() => {
    const baseLabels = getSegmentNavLabels(segment);
    if (!segmentCtx.usesCapabilityEngine) return baseLabels;
    return {
      ...baseLabels,
      team: segmentCtx.terminology.professionals,
      teamDescription: `${segmentCtx.terminology.professionals} e produtividade`,
      workOrders: segmentCtx.terminology.workOrder,
      workOrdersDescription: segmentCtx.terminology.workOrder,
    };
  })();

  const items: NavItem[] = [
    {
      id: "ops-center",
      title: labels.opsCenterTitle,
      href: `${base}/centro-operacoes`,
      icon: Activity,
      group: "principal",
      description: labels.opsCenterDescription,
      requiredAnyPermissions: [
        "centro_operacoes.visualizar",
        "dashboard.operacional",
        "os.visualizar",
      ],
    },
    {
      id: "dashboard",
      title: "Dashboard",
      href: `${base}/dashboard`,
      icon: LayoutDashboard,
      group: "principal",
      description: "Visão geral do negócio",
      requiredAnyPermissions: [
        "dashboard.executivo",
        "dashboard.visualizar",
        "analytics.executivo",
      ],
    },
    {
      id: "search",
      title: "Busca",
      href: `${base}/busca`,
      icon: Search,
      group: "principal",
      description: "Localizar cadastros mestres",
    },
    {
      id: "intelligence-hub",
      title: "Inteligência",
      href: `${base}/inteligencia`,
      icon: Brain,
      group: "inteligencia",
      description: "Copiloto Executivo e insights com evidências",
      requiredAnyPermissions: [
        "inteligencia.visualizar",
        "inteligencia.executivo",
        "dashboard.executivo",
      ],
    },
    {
      id: "tax-hub",
      title: "Tributário",
      href: `${base}/tributario`,
      icon: Landmark,
      group: "inteligencia",
      description: "Regras, simulações e cockpit fiscal",
      requiredAnyPermissions: [
        "tax.visualizar",
        "financeiro.tributos.visualizar",
        "dashboard.executivo",
      ],
    },
    {
      id: "crm",
      title: "CRM",
      href: `${base}/crm`,
      icon: Users,
      group: "inteligencia",
      description: "Relacionamento Enterprise e pipeline",
      requiredAnyPermissions: ["crm.visualizar", "clientes.visualizar"],
    },
    {
      id: "clients",
      title: segmentCtx.usesCapabilityEngine
        ? segmentCtx.terminology.customers
        : "Clientes",
      href: `${base}/clientes`,
      icon: Users,
      group: "operacao",
      description: "Cadastro único de clientes",
      requiredAnyPermissions: ["clientes.visualizar", "crm.visualizar"],
    },
    {
      id: "products",
      title: segmentCtx.usesCapabilityEngine
        ? segmentCtx.terminology.catalog
        : "Produtos & Serviços",
      href: `${base}/produtos`,
      icon: Package,
      group: "operacao",
      description: "Catálogo e estoque",
      requiredAnyPermissions: ["produtos.visualizar"],
    },
    {
      id: "inventory",
      title: "Estoque",
      href: `${base}/estoque`,
      icon: Warehouse,
      group: "operacao",
      description: "Movimentações e saldos",
      requiredAnyPermissions: ["estoque.visualizar", "produtos.visualizar"],
    },
    {
      id: "purchases",
      title: "Compras",
      href: `${base}/compras`,
      icon: Truck,
      group: "operacao",
      description: "Supply Chain Enterprise",
      requiredAnyPermissions: ["compras.visualizar", "fornecedores.visualizar"],
    },
    {
      id: "sales",
      title: "Vendas",
      href: `${base}/vendas`,
      icon: ShoppingCart,
      group: "operacao",
      description: "Pedidos e orçamentos",
      requiredAnyPermissions: ["vendas.visualizar"],
    },
    {
      id: "work-orders",
      title: labels.workOrders,
      href: `${base}/ordens`,
      icon: Wrench,
      group: "operacao",
      description: labels.workOrdersDescription,
      requiredAnyPermissions: ["os.visualizar"],
    },
    {
      id: "agenda",
      title: "Agenda",
      href: `${base}/agenda`,
      icon: CalendarDays,
      group: "operacao",
      description: "Agenda operacional e comercial",
      requiredAnyPermissions: ["agenda.visualizar", "crm.visualizar"],
    },
    {
      id: "mechanics",
      title: labels.team,
      href: `${base}/oficina/mecanicos`,
      icon: Users,
      group: "operacao",
      description: labels.teamDescription,
      requiredAnyPermissions: ["mecanicos.visualizar", "os.visualizar"],
    },
    {
      id: "finance",
      title: "Financeiro",
      href: `${base}/financeiro`,
      icon: Wallet,
      group: "inteligencia",
      description: "Fluxo de caixa, CFO e orçamento",
      requiredAnyPermissions: [
        "financeiro.visualizar",
        "dashboard.financeiro",
        "analytics.financeiro",
      ],
    },
    {
      id: "integrations",
      title: "Integrações",
      href: `${base}/integracoes/importar`,
      icon: Plug,
      group: "inteligencia",
      description: "Importação de arquivos e dados",
      requiredAnyPermissions: [
        "integracoes.visualizar",
        "integracoes.administrar",
        "configuracoes.integracoes",
      ],
    },
    {
      id: "automacoes",
      title: "Automações",
      href: `${base}/automacoes`,
      icon: Workflow,
      group: "inteligencia",
      description: "Regras, aprovações e fluxos internos",
      requiredAnyPermissions: [
        "automacoes.visualizar",
        "automacoes.administrar",
      ],
    },
    {
      id: "analytics",
      title: "Analytics",
      href: `${base}/analytics`,
      icon: BarChart3,
      group: "inteligencia",
      description: "BI e indicadores Enterprise",
      requiredAnyPermissions: NAV_ANALYTICS_EXECUTIVE_ANY_OF,
    },
    {
      id: "analytics-reports",
      title: "Relatórios",
      href: `${base}/analytics/relatorios`,
      icon: FileBarChart,
      group: "inteligencia",
      description: "Indicadores e análises",
      requiredAnyPermissions: NAV_ANALYTICS_VIEW_ANY_OF,
    },
    {
      id: "settings",
      title: "Configurações",
      href: `${base}/configuracoes`,
      icon: Settings,
      group: "sistema",
      description: "Empresa, equipe e preferências",
    },
  ];

  // Sprint 34.5 — piloto: ocultar módulos mock/parcial que aparentam prontidão.
  const PILOT_HIDDEN_IDS = new Set(["automacoes"]);

  const byLegacyLabels = items.filter((item) => {
    if (PILOT_HIDDEN_IDS.has(item.id)) return false;
    if (!segmentCtx.usesCapabilityEngine) {
      if (item.id === "mechanics" && !labels.showTeamNavItem) return false;
      if (item.id === "work-orders" && !labels.showWorkOrders) return false;
    }
    return true;
  });

  return filterNavByCapabilities(byLegacyLabels, segmentCtx);
}

export const marketingNav = [
  { title: "Recursos", href: "#recursos" },
  { title: "Plataforma", href: "#plataforma" },
  { title: "Inteligência", href: "#inteligencia" },
  { title: "Segmentos", href: "#segmentos" },
  { title: "Começar", href: "#cta" },
] as const;
