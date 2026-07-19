export type HealthScoreLabel =
  | "Excelente"
  | "Saudável"
  | "Atenção"
  | "Crítico"
  | "Emergência";

export type HealthScoreFactorId =
  | "ebitda"
  | "fluxo"
  | "cmv"
  | "margem"
  | "contas_receber"
  | "contas_pagar"
  | "estoque"
  | "crescimento_vendas";

export type HealthScoreFactor = {
  id: HealthScoreFactorId;
  label: string;
  weight: number;
  score: number;
  detail: string;
};

export type HealthScoreResult = {
  score: number;
  label: HealthScoreLabel;
  factors: HealthScoreFactor[];
};

export type AlertPriority = "critical" | "high" | "medium" | "low" | "info";

export type AlertCategory =
  | "financeiro"
  | "operacional"
  | "comercial"
  | "estoque"
  | "meta";

export type IntelligenceAlert = {
  id: string;
  priority: AlertPriority;
  category: AlertCategory;
  title: string;
  description: string;
  recommendation: string;
  href: string;
};

export type ChecklistItemId =
  | "empresa"
  | "contas_bancarias"
  | "categorias"
  | "plano_contas"
  | "produtos"
  | "clientes"
  | "vendas"
  | "compras"
  | "usuarios"
  | "configuracoes";

export type ChecklistItem = {
  id: ChecklistItemId;
  title: string;
  description: string;
  completed: boolean;
  href: string;
};

export type ChecklistResult = {
  items: ChecklistItem[];
  completedCount: number;
  totalCount: number;
  progressPct: number;
};

export type ActivityKind =
  | "venda_faturada"
  | "recebimento"
  | "pagamento"
  | "cliente_cadastrado"
  | "produto_cadastrado"
  | "estoque_movimentacao";

export type ActivityItem = {
  id: string;
  kind: ActivityKind;
  title: string;
  description: string;
  occurredAt: string;
  href: string;
};

export type PriorityItem = {
  id: string;
  rank: number;
  priority: AlertPriority;
  title: string;
  description: string;
  href: string;
  source: "alert" | "checklist";
};

export type DashboardIntelligenceInput = {
  tenantSlug: string;
  tenantName: string;
  segment: string | null;
  periodo: { dataDe: string; dataAte: string };
  kpis: {
    faturamento: number;
    receita_liquida: number;
    ebitda: number;
    cmv: number;
    margem_media: number;
    saldo_bancario: number;
    entradas_previstas: number;
    saidas_previstas: number;
    quantidade_vendas: number;
  };
  comparisons: {
    quantidade_vendas: {
      current: number;
      previous: number;
      variationPct: number | null;
      trend: "up" | "down" | "neutral";
    };
    faturamento: {
      current: number;
      previous: number;
      variationPct: number | null;
    };
  };
  fluxo: {
    saldo_projetado: number;
    saldo_atual: number;
  };
  contasReceber: {
    total_aberto: number;
    total_vencido: number;
    quantidade_vencido: number;
  };
  contasPagar: {
    total_aberto: number;
    total_vencido: number;
    quantidade_vencido: number;
  };
  estoqueBaixoCount: number;
  produtosParadosCount: number;
  concentracaoCliente: {
    clienteId: string | null;
    clienteNome: string | null;
    sharePct: number;
  };
};

export type DashboardIntelligenceResult = {
  healthScore: HealthScoreResult;
  alerts: IntelligenceAlert[];
  priorities: PriorityItem[];
  checklist: ChecklistResult;
  activities: ActivityItem[];
};
