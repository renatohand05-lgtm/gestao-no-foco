/**
 * Fase 23 — Snapshot de domínio injetado no Analytics Engine.
 * Valores já calculados pelos módulos fonte — sem recalcular fórmulas.
 */

export type AnalyticsDomainSnapshot = {
  tenantId: string;
  tenantSlug: string;
  asOf: string;
  finance?: {
    receitaBruta?: number | null;
    receitaLiquida?: number | null;
    ebitda?: number | null;
    margemEbitda?: number | null;
    ebit?: number | null;
    lucroLiquido?: number | null;
    despesas?: number | null;
    cmv?: number | null;
    previous?: Partial<{
      receitaBruta: number;
      receitaLiquida: number;
      ebitda: number;
      margemEbitda: number;
      ebit: number;
      lucroLiquido: number;
      despesas: number;
      cmv: number;
    }>;
    topCentros?: Array<{ id: string; label: string; value: number }>;
    topClientes?: Array<{ id: string; label: string; value: number }>;
  };
  cash?: {
    entradas?: number | null;
    saidas?: number | null;
    saldoConsolidado?: number | null;
    capitalGiro?: number | null;
    necessidadeCaixa?: number | null;
    fluxoRealizadoNet?: number | null;
    fluxoPrevistoNet?: number | null;
    fluxoProjetadoClosing?: number | null;
    contasPagar?: number | null;
    contasReceber?: number | null;
    inadimplencia?: number | null;
    riskAlertCount?: number;
  };
  sales?: {
    faturamento?: number | null;
    quantidade?: number | null;
    ticketMedio?: number | null;
    conversao?: number | null;
    cancelamentos?: number | null;
    descontos?: number | null;
    previousFaturamento?: number | null;
    bySeller?: Array<{ id: string; label: string; value: number }>;
    byClient?: Array<{ id: string; label: string; value: number }>;
    byProduct?: Array<{ id: string; label: string; value: number }>;
    byBranch?: Array<{ id: string; label: string; value: number }>;
    byChannel?: Array<{ id: string; label: string; value: number }>;
    margem?: number | null;
  };
  customers?: {
    ativos?: number | null;
    novos?: number | null;
    recorrentes?: number | null;
    inativos?: number | null;
    frequencia?: number | null;
    ticketMedio?: number | null;
    receitaPorCliente?: number | null;
    concentracaoTop?: number | null;
    emRisco?: number | null;
  };
  operations?: {
    quantidade?: number | null;
    abertas?: number | null;
    concluidas?: number | null;
    tempoMedio?: number | null;
    retrabalho?: number | null;
    conversao?: number | null;
    faturamento?: number | null;
    ticketMedio?: number | null;
    produtividade?: number | null;
    servicos?: Array<{ id: string; label: string; value: number }>;
  };
  inventory?: {
    valor?: number | null;
    giro?: number | null;
    cobertura?: number | null;
    ruptura?: number | null;
    excesso?: number | null;
    itensParados?: number | null;
    compras?: number | null;
    consumo?: number | null;
    margemProduto?: number | null;
  };
  tax?: {
    carga?: number | null;
    previsto?: number | null;
    impactoCaixa?: number | null;
    eficiencia?: number | null;
    oportunidades?: number | null;
    riscos?: number | null;
    impactoEbitdaRatio?: number | null;
    byRegime?: Array<{ id: string; label: string; value: number }>;
    byBranch?: Array<{ id: string; label: string; value: number }>;
  };
  metas?: {
    metaFaturamento?: number | null;
    realizadoFaturamento?: number | null;
    projecaoFaturamento?: number | null;
    attainment?: number | null;
    probabilidadeLabel?: string | null;
  };
  series?: Record<string, Array<{ period: string; value: number | null }>>;
  /** Saúde por fatia — falha isolada não derruba o dashboard. */
  sourceHealth?: Record<
    string,
    {
      status: "ok" | "empty" | "error";
      message: string;
      updatedAt?: string;
    }
  >;
};
