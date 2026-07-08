import {
  DollarSign,
  Package,
  ShoppingCart,
  TrendingUp,
  UserPlus,
  Users,
  Wrench,
} from "lucide-react";

import {
  formatCurrency,
  formatNumber,
  getCurrentMonthLabel,
  getGreeting,
} from "@/lib/dashboard/format";
import type { DashboardData } from "@/types/dashboard";
import type { TenantSegment } from "@/types";

const segmentLabels: Record<TenantSegment, string> = {
  oficina: "oficina mecânica",
  restaurante: "restaurante",
  comercio: "comércio",
  consultoria: "consultoria",
  servicos: "prestador de serviços",
  outro: "negócio",
};

export function getDashboardMockData({
  tenantName,
  tenantSegment,
  userName,
}: {
  tenantName: string;
  tenantSegment: TenantSegment | null;
  userName?: string | null;
}): DashboardData {
  const segment =
    tenantSegment && segmentLabels[tenantSegment]
      ? segmentLabels[tenantSegment]
      : "negócio";

  return {
    greeting: getGreeting(userName),
    subtitle: `Visão geral de ${tenantName}`,
    periodLabel: getCurrentMonthLabel(),
    stats: [
      {
        id: "revenue",
        title: "Receita do mês",
        value: formatCurrency(24850),
        change: "+12,4%",
        trend: "up",
        description: "vs. mês anterior",
        icon: DollarSign,
      },
      {
        id: "sales",
        title: "Vendas",
        value: formatNumber(47),
        change: "+8",
        trend: "up",
        description: "pedidos este mês",
        icon: ShoppingCart,
      },
      {
        id: "customers",
        title: "Clientes ativos",
        value: formatNumber(128),
        change: "+3",
        trend: "up",
        description: "novos este mês",
        icon: Users,
      },
      {
        id: "ticket",
        title: "Ticket médio",
        value: formatCurrency(528.72),
        change: "-2,1%",
        trend: "down",
        description: "vs. mês anterior",
        icon: TrendingUp,
      },
    ],
    weeklyOverview: [
      { label: "Seg", value: 62 },
      { label: "Ter", value: 74 },
      { label: "Qua", value: 58 },
      { label: "Qui", value: 91 },
      { label: "Sex", value: 83 },
      { label: "Sáb", value: 48 },
      { label: "Dom", value: 35 },
    ],
    activities: [
      {
        id: "1",
        title: "Venda concluída",
        description: "Pedido #1042 — R$ 1.240,00",
        time: "Há 12 min",
        icon: ShoppingCart,
        tone: "success",
      },
      {
        id: "2",
        title: "Novo cliente",
        description: "Maria Oliveira cadastrada",
        time: "Há 45 min",
        icon: UserPlus,
        tone: "info",
      },
      {
        id: "3",
        title: "Ordem finalizada",
        description: "OS #089 — revisão completa",
        time: "Há 2 h",
        icon: Wrench,
        tone: "default",
      },
      {
        id: "4",
        title: "Estoque baixo",
        description: "Filtro de óleo — 3 unidades",
        time: "Há 4 h",
        icon: Package,
        tone: "warning",
      },
      {
        id: "5",
        title: "Pagamento recebido",
        description: "R$ 890,00 — Cliente João Silva",
        time: "Ontem",
        icon: DollarSign,
        tone: "success",
      },
    ],
    alerts: [
      {
        id: "1",
        title: "3 contas a vencer",
        description: "Vencimentos nos próximos 7 dias",
        priority: "high",
      },
      {
        id: "2",
        title: "Meta mensal em 78%",
        description: `Faltam ${formatCurrency(5450)} para a meta`,
        priority: "medium",
      },
      {
        id: "3",
        title: `Perfil de ${segment}`,
        description: "Dados de demonstração para o seu segmento",
        priority: "low",
      },
    ],
    setupSteps: [
      {
        id: "1",
        title: "Empresa configurada",
        description: tenantName,
        completed: true,
      },
      {
        id: "2",
        title: "Cadastrar clientes",
        description: "Importe ou adicione manualmente",
        completed: false,
      },
      {
        id: "3",
        title: "Montar catálogo",
        description: "Produtos e serviços do negócio",
        completed: false,
      },
      {
        id: "4",
        title: "Convidar equipe",
        description: "Colaboradores com papéis de acesso",
        completed: false,
      },
    ],
  };
}
