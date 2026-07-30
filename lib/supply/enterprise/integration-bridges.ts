/**
 * Fase 25 — Pontes de integração (reuso Finance / CRM / Analytics / Tax).
 * Arquitetura apenas — sem duplicar fontes.
 */

export type SupplyIntegrationBridge = {
  id: string;
  target: "finance" | "crm" | "analytics" | "tax" | "vendas" | "ordens" | "nfe";
  status: "ready" | "preparing" | "flag_off";
  description: string;
  reusePath: string;
};

export const SUPPLY_INTEGRATION_BRIDGES: readonly SupplyIntegrationBridge[] = [
  {
    id: "finance-ap",
    target: "finance",
    status: "ready",
    description:
      "Status integrado cria contas a pagar via Finance Core quando o fornecedor tem classificação (categoria/centro/plano). Idempotente por compra_pedido_id.",
    reusePath: "lib/financeiro/conta-pagar-service · purchase-integration",
  },
  {
    id: "finance-cash",
    target: "finance",
    status: "preparing",
    description: "Caixa/tesouraria após pagamento do AP — fluxo Finance existente, não duplicado.",
    reusePath: "lib/finance/cash-intelligence",
  },
  {
    id: "crm-cliente",
    target: "crm",
    status: "ready",
    description:
      "Devoluções/consumidor usam base única de clientes — sem segunda base CRM.",
    reusePath: "lib/crm · lib/clientes",
  },
  {
    id: "analytics-estoque",
    target: "analytics",
    status: "ready",
    description: "KPIs de estoque reutilizam Analytics Core e executive-stock.",
    reusePath: "lib/analytics · lib/estoque/executive-stock-*",
  },
  {
    id: "tax-ncm",
    target: "tax",
    status: "preparing",
    description:
      "NCM/CEST/origem no cadastro alimentam Tax Intelligence — sem decisão automática.",
    reusePath: "lib/finance/tax-intelligence",
  },
  {
    id: "vendas-consumo",
    target: "vendas",
    status: "ready",
    description: "Baixa de estoque em vendas via venda_itens.produto_id.",
    reusePath: "lib/vendas",
  },
  {
    id: "ordens-consumo",
    target: "ordens",
    status: "ready",
    description: "Consumo de peças em OS via ordem_servico_itens.",
    reusePath: "lib/ordens",
  },
  {
    id: "nfe-entrada",
    target: "nfe",
    status: "ready",
    description: "Recebimento fiscal reutiliza NF-e de entrada existente.",
    reusePath: "lib/nfe · /estoque/notas-fiscais",
  },
];

export function describeSupplyIntegrationArchitecture() {
  return {
    version: "25.0" as const,
    principle: "Reutilizar Finance, CRM, Analytics, Vendas, OS e NF-e — sem fontes paralelas.",
    bridges: SUPPLY_INTEGRATION_BRIDGES,
  };
}

export function listSupplyIntegrationBridges() {
  return [...SUPPLY_INTEGRATION_BRIDGES];
}
