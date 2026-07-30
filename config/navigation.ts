import {
  Activity,
  BarChart3,
  LayoutDashboard,
  Package,
  Plug,
  Search,
  Settings,
  ShoppingCart,
  Users,
  Wallet,
  Warehouse,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  description?: string;
};

export function getTenantNav(tenantSlug: string): NavItem[] {
  const base = `/${tenantSlug}`;

  return [
    {
      title: "Centro de Operações",
      href: `${base}/centro-operacoes`,
      icon: Activity,
      description: "Quadro ao vivo da oficina",
    },
    {
      title: "Dashboard",
      href: `${base}/dashboard`,
      icon: LayoutDashboard,
      description: "Visão geral do negócio",
    },
    {
      title: "Busca",
      href: `${base}/busca`,
      icon: Search,
      description: "Localizar cadastros mestres",
    },
    {
      title: "CRM",
      href: `${base}/crm`,
      icon: Users,
      description: "Relacionamento Enterprise e pipeline",
    },
    {
      title: "Clientes",
      href: `${base}/clientes`,
      icon: Users,
      description: "Cadastro único de clientes",
    },
    {
      title: "Produtos & Serviços",
      href: `${base}/produtos`,
      icon: Package,
      description: "Catálogo e estoque",
    },
    {
      title: "Estoque",
      href: `${base}/estoque`,
      icon: Warehouse,
      description: "Movimentações e saldos",
    },
    {
      title: "Vendas",
      href: `${base}/vendas`,
      icon: ShoppingCart,
      description: "Pedidos e orçamentos",
    },
    {
      title: "Ordens de Serviço",
      href: `${base}/ordens`,
      icon: Wrench,
      description: "Oficinas e prestadores",
    },
    {
      title: "Mecânicos",
      href: `${base}/oficina/mecanicos`,
      icon: Users,
      description: "Equipe, custos e produtividade",
    },
    {
      title: "Financeiro",
      href: `${base}/financeiro`,
      icon: Wallet,
      description: "Fluxo de caixa e contas",
    },
    {
      title: "Integrações",
      href: `${base}/integracoes`,
      icon: Plug,
      description: "Importar arquivos, APIs e colar dados",
    },
    {
      title: "Analytics",
      href: `${base}/analytics`,
      icon: BarChart3,
      description: "BI e indicadores Enterprise",
    },
    {
      title: "Relatórios",
      href: `${base}/analytics/relatorios`,
      icon: BarChart3,
      description: "Indicadores e análises",
    },
    {
      title: "Configurações",
      href: `${base}/configuracoes`,
      icon: Settings,
      description: "Empresa, equipe e preferências",
    },
  ];
}

export const marketingNav = [
  { title: "Recursos", href: "#recursos" },
  { title: "Segmentos", href: "#segmentos" },
  { title: "Preços", href: "#precos" },
] as const;
