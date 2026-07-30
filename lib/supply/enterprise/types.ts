/**
 * Fase 25 — Tipos Supply Chain Enterprise (puros).
 */

export type SupplyKpiUnit = "count" | "currency" | "percent" | "days" | "ratio";

export type SupplyKpiId =
  | "supply.giro"
  | "supply.cobertura"
  | "supply.ruptura"
  | "supply.excesso"
  | "supply.curva_abc"
  | "supply.parado"
  | "supply.compras_mes"
  | "supply.fornecedores"
  | "supply.consumo"
  | "supply.margem"
  | "supply.custo_medio"
  | "supply.valorizacao"
  | "supply.perdas"
  | "supply.inventario";

export type SupplyKpiDefinition = {
  id: SupplyKpiId;
  name: string;
  unit: SupplyKpiUnit;
  formula: string;
  source: string;
  polarity: "higher_is_better" | "lower_is_better" | "neutral";
  availability: "available" | "unavailable";
  unavailableReason?: string;
  drillDownAvailable: boolean;
};

export type SupplyKpiResult = {
  definitionId: SupplyKpiId | string;
  name: string;
  value: number | null;
  formatted: string;
  unit: SupplyKpiUnit;
  availability: "available" | "unavailable" | "partial";
  unavailableReason?: string;
  confidence: "high" | "medium" | "low" | "none";
  source: string;
  tenantId: string;
  drillDownAvailable: boolean;
};

export type SupplyDrillDownItem = {
  id: string;
  label: string;
  value: number;
  meta?: Record<string, string | number | null>;
};

export type SupplyDrillDown = {
  definitionId: SupplyKpiId;
  title: string;
  items: SupplyDrillDownItem[];
  total: number;
  source: string;
};

export type SupplyAlertSeverity = "critica" | "alta" | "media" | "baixa";

export type SupplyAlert = {
  id: string;
  severity: SupplyAlertSeverity;
  title: string;
  description: string;
  kpiId?: SupplyKpiId;
  actionHint?: string;
};

export type SupplyFilterInput = {
  periodoDe?: string | null;
  periodoAte?: string | null;
  empresaId?: string | null;
  filialId?: string | null;
  depositoId?: string | null;
  almoxarifadoId?: string | null;
  fornecedorId?: string | null;
  categoria?: string | null;
  status?: string | null;
  responsavelId?: string | null;
  /** Rejeitado se vier do client — tenant só server-side */
  tenantId?: string;
  tenant_id?: string;
};

export type SupplyFilter = {
  periodoDe: string | null;
  periodoAte: string | null;
  empresaId: string | null;
  filialId: string | null;
  depositoId: string | null;
  almoxarifadoId: string | null;
  fornecedorId: string | null;
  categoria: string | null;
  status: string | null;
  responsavelId: string | null;
};

export type SupplyProductBalance = {
  produtoId: string;
  nome: string;
  sku: string | null;
  categoria: string | null;
  tipo: string;
  saldo: number;
  minimo: number | null;
  maximo: number | null;
  seguranca: number | null;
  custo: number | null;
  precoVenda: number | null;
  fornecedorPrincipal: string | null;
  diasSemMovimentacao: number | null;
  saidasPeriodo: number;
  valorEstoque: number | null;
};

export type SupplyPurchaseSummary = {
  solicitacoesAbertas: number | null;
  pedidosAbertos: number | null;
  pedidosMes: number | null;
  valorPedidosMes: number | null;
  recebimentosPendentes: number | null;
};

export type SupplyInventorySummary = {
  ciclosAbertos: number | null;
  divergencias: number | null;
  ajustesPendentes: number | null;
};

export type SupplyEnterpriseSnapshot = {
  tenantId: string;
  tenantSlug: string;
  asOf: string;
  empresaId?: string | null;
  filialId?: string | null;
  filter: SupplyFilter;
  products: SupplyProductBalance[];
  kpisRaw: {
    giro: number | null;
    coberturaDias: number | null;
    rupturaCount: number | null;
    excessoCount: number | null;
    abcACount: number | null;
    paradoCount: number | null;
    comprasMesValor: number | null;
    fornecedoresAtivos: number | null;
    consumoPeriodo: number | null;
    margemMedia: number | null;
    custoMedio: number | null;
    valorizacao: number | null;
    perdasValor: number | null;
    inventarioDivergencias: number | null;
  };
  purchases: SupplyPurchaseSummary;
  inventory: SupplyInventorySummary;
  warehouseReady: boolean;
  purchaseWorkflowReady: boolean;
  health: Record<string, { status: "ok" | "error" | "empty"; message: string }>;
};

export type PurchaseWorkflowStatus =
  | "rascunho"
  | "solicitacao"
  | "aprovacao"
  | "cotacao"
  | "comparacao"
  | "pedido"
  | "recebimento"
  | "conferencia"
  | "integrado"
  | "cancelado";

export type MovementKind =
  | "entrada"
  | "saida"
  | "transferencia"
  | "ajuste"
  | "inventario"
  | "perda"
  | "devolucao"
  | "consumo_interno"
  | "reserva"
  | "separacao"
  | "expedicao"
  | "liberacao_reserva";

export type ProductEnterpriseTipo =
  | "produto"
  | "peca"
  | "servico"
  | "kit"
  | "materia_prima"
  | "composto"
  | "ativo_consumo"
  | "combo";
