/**
 * Sprint 22.8 — Registry de conectores Enterprise (placeholders em preparação).
 * Nenhum conector ERP/banco simula sync ativo nesta fase.
 */
import type { ConnectorRegistryEntry, EnterpriseDataConnector } from "./types.ts";

const PREPARING_MSG =
  "Conector em preparação — integração real será habilitada após homologação e feature flags.";

export const CONNECTOR_REGISTRY: ConnectorRegistryEntry[] = [
  {
    id: "rest_api",
    name: "API REST genérica",
    category: "rest_api",
    description: "Receber dados via API REST autenticada (stub arquitetural).",
    status: "preparing",
    preparingMessage: PREPARING_MSG,
  },
  {
    id: "webhook",
    name: "Webhook de importação",
    category: "webhook",
    description: "Endpoint assinado para push de arquivos/registros.",
    status: "preparing",
    preparingMessage: PREPARING_MSG,
  },
  {
    id: "erp_omie",
    name: "Omie ERP",
    category: "erp",
    description: "Sincronização Omie — contrato apenas, sem sync simulado.",
    status: "preparing",
    vendor: "Omie",
    preparingMessage: "Integração Omie em preparação — não marcar como conectado.",
  },
  {
    id: "erp_conta_azul",
    name: "Conta Azul",
    category: "erp",
    description: "Sincronização Conta Azul — contrato apenas.",
    status: "preparing",
    vendor: "Conta Azul",
    preparingMessage: "Integração Conta Azul em preparação — não marcar como conectado.",
  },
  {
    id: "erp_bling",
    name: "Bling",
    category: "erp",
    description: "Sincronização Bling — contrato apenas.",
    status: "preparing",
    vendor: "Bling",
    preparingMessage: "Integração Bling em preparação — não marcar como conectado.",
  },
  {
    id: "banking_open_finance",
    name: "Open Finance / Bancos",
    category: "banking",
    description: "Conectores bancários — contrato apenas.",
    status: "preparing",
    preparingMessage: "Integração bancária em preparação — use OFX/CSV nesta fase.",
  },
  {
    id: "sales_channel",
    name: "Canais de Vendas",
    category: "sales",
    description: "Importação contínua de vendas — em preparação.",
    status: "preparing",
    preparingMessage: PREPARING_MSG,
  },
  {
    id: "service_orders_channel",
    name: "Ordens de Serviço",
    category: "service_orders",
    description: "Importação contínua de OS — em preparação.",
    status: "preparing",
    preparingMessage: PREPARING_MSG,
  },
];

export function listConnectorDefinitions(): ConnectorRegistryEntry[] {
  return [...CONNECTOR_REGISTRY];
}

export function getConnectorDefinition(id: string): ConnectorRegistryEntry | null {
  return CONNECTOR_REGISTRY.find((c) => c.id === id) ?? null;
}

/** Placeholder — nenhum conector retorna instância ativa nesta fase. */
export function resolveConnector(
  _tenantId: string,
  connectorId: string,
): EnterpriseDataConnector | null {
  const def = getConnectorDefinition(connectorId);
  if (!def || def.status !== "connected") return null;
  return null;
}

export function isConnectorLive(id: string): boolean {
  const def = getConnectorDefinition(id);
  return def?.status === "connected";
}

export function allConnectorsPreparing(): boolean {
  return CONNECTOR_REGISTRY.every((c) => c.status === "preparing");
}
