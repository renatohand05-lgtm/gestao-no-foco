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
  Wrench,
  type LucideIcon,
} from "lucide-react";

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

export function getTenantNav(tenantSlug: string): NavItem[] {
  const base = `/${tenantSlug}`;

  return [
    {
      id: "ops-center",
      title: "Centro de Operações",
      href: `${base}/centro-operacoes`,
      icon: Activity,
      group: "principal",
      description: "Quadro ao vivo da oficina",
    },
    {
      id: "dashboard",
      title: "Dashboard",
      href: `${base}/dashboard`,
      icon: LayoutDashboard,
      group: "principal",
      description: "Visão geral do negócio",
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
    },
    {
      id: "clients",
      title: "Clientes",
      href: `${base}/clientes`,
      icon: Users,
      group: "operacao",
      description: "Cadastro único de clientes",
    },
    {
      id: "products",
      title: "Produtos & Serviços",
      href: `${base}/produtos`,
      icon: Package,
      group: "operacao",
      description: "Catálogo e estoque",
    },
    {
      id: "inventory",
      title: "Estoque",
      href: `${base}/estoque`,
      icon: Warehouse,
      group: "operacao",
      description: "Movimentações e saldos",
    },
    {
      id: "purchases",
      title: "Compras",
      href: `${base}/compras`,
      icon: Truck,
      group: "operacao",
      description: "Supply Chain Enterprise",
    },
    {
      id: "sales",
      title: "Vendas",
      href: `${base}/vendas`,
      icon: ShoppingCart,
      group: "operacao",
      description: "Pedidos e orçamentos",
    },
    {
      id: "work-orders",
      title: "Ordens de Serviço",
      href: `${base}/ordens`,
      icon: Wrench,
      group: "operacao",
      description: "Ordem de Trabalho · oficinas e prestadores",
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
      title: "Mecânicos",
      href: `${base}/oficina/mecanicos`,
      icon: Users,
      group: "operacao",
      description: "Equipe, custos e produtividade",
    },
    {
      id: "finance",
      title: "Financeiro",
      href: `${base}/financeiro`,
      icon: Wallet,
      group: "inteligencia",
      description: "Fluxo de caixa, CFO e orçamento",
    },
    {
      id: "integrations",
      title: "Integrações",
      href: `${base}/integracoes`,
      icon: Plug,
      group: "inteligencia",
      description: "Importar arquivos, APIs e colar dados",
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
}

export const marketingNav = [
  { title: "Recursos", href: "#recursos" },
  { title: "Plataforma", href: "#plataforma" },
  { title: "Inteligência", href: "#inteligencia" },
  { title: "Segmentos", href: "#segmentos" },
  { title: "Começar", href: "#cta" },
] as const;
