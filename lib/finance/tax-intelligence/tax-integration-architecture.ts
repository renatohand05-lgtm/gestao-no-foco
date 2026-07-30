/**
 * Sprint 26.7 — Arquitetura de integrações tributárias.
 * Somente contrato/registry — sem simular integrações reais.
 */

import { isTaxExternalIntegrationsEnabled } from "./tax-feature-flags.ts";
import type { TaxIntegrationConnector } from "./types.ts";

export const TAX_INTEGRATION_CONNECTORS: readonly TaxIntegrationConnector[] = [
  {
    id: "erp-generic",
    category: "erp",
    name: "ERP genérico",
    status: "preparing",
    description: "Contrato para sync de bases e entidades a partir de ERPs.",
    featureFlag: "TAX_EXTERNAL_INTEGRATIONS_ENABLED",
  },
  {
    id: "fiscal-engine",
    category: "fiscal",
    name: "Motor fiscal externo",
    status: "preparing",
    description: "Provider externo de apuração — plugável no Tax Engine.",
    featureFlag: "TAX_EXTERNAL_INTEGRATIONS_ENABLED",
  },
  {
    id: "accounting-suite",
    category: "accounting",
    name: "Sistema contábil",
    status: "preparing",
    description: "Exportação/importação de lançamentos e plano tributário.",
    featureFlag: "TAX_EXTERNAL_INTEGRATIONS_ENABLED",
  },
  {
    id: "gov-apis",
    category: "government",
    name: "APIs governamentais",
    status: "preparing",
    description: "Contrato para consultas oficiais (sem chamada real nesta sprint).",
    featureFlag: "TAX_EXTERNAL_INTEGRATIONS_ENABLED",
  },
  {
    id: "tax-provider",
    category: "tax_provider",
    name: "Provedor tributário",
    status: "preparing",
    description: "Marketplace de tabelas/parametrizações versionadas.",
    featureFlag: "TAX_EXTERNAL_INTEGRATIONS_ENABLED",
  },
] as const;

export function listTaxIntegrationConnectors(): TaxIntegrationConnector[] {
  const enabled = isTaxExternalIntegrationsEnabled();
  return TAX_INTEGRATION_CONNECTORS.map((c) => ({
    ...c,
    status: enabled ? "preparing" : "disabled",
  }));
}

export type TaxIntegrationArchitecture = {
  version: "26.7";
  principle: string;
  connectors: TaxIntegrationConnector[];
  notes: string[];
};

export function describeTaxIntegrationArchitecture(): TaxIntegrationArchitecture {
  return {
    version: "26.7",
    principle:
      "Integrações são adapters plugáveis no Tax Engine / Import Engine — nunca regras fiscais no conector.",
    connectors: listTaxIntegrationConnectors(),
    notes: [
      "Nenhuma chamada HTTP/governamental nesta sprint.",
      "Flags controlam disponibilidade de UI/contratos.",
      "Regras permanecem em tax_rule_versions versionadas.",
    ],
  };
}
