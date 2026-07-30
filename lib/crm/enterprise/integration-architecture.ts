/**
 * Fase 24 — Arquitetura de integrações CRM (somente contrato).
 */

import { isCrmExternalIntegrationsEnabled } from "../crm-feature-flags.ts";
import type { CrmIntegrationConnector } from "./types.ts";

export const CRM_INTEGRATION_CONNECTORS: readonly CrmIntegrationConnector[] = [
  {
    id: "whatsapp-business",
    category: "whatsapp",
    name: "WhatsApp Business",
    status: "preparing",
    description: "Contrato para templates, opt-in e histórico de mensagens — sem envio real.",
    featureFlag: "CRM_EXTERNAL_INTEGRATIONS_ENABLED",
  },
  {
    id: "email-smtp",
    category: "email",
    name: "E-mail transacional",
    status: "preparing",
    description: "Adapter para campanhas e follow-up por e-mail.",
    featureFlag: "CRM_EXTERNAL_INTEGRATIONS_ENABLED",
  },
  {
    id: "telephony-click-to-call",
    category: "telephony",
    name: "Telefonia / Click-to-call",
    status: "preparing",
    description: "Registro de ligações e CTI — arquitetura apenas.",
    featureFlag: "CRM_EXTERNAL_INTEGRATIONS_ENABLED",
  },
  {
    id: "erp-customers",
    category: "erp",
    name: "ERP — sync de clientes",
    status: "preparing",
    description: "Sincroniza com a base única `clientes` (nunca cria segunda base).",
    featureFlag: "CRM_EXTERNAL_INTEGRATIONS_ENABLED",
  },
  {
    id: "crm-public-api",
    category: "api",
    name: "API pública CRM",
    status: "preparing",
    description: "Contrato REST futuro para webhooks e parceiros.",
    featureFlag: "CRM_EXTERNAL_INTEGRATIONS_ENABLED",
  },
] as const;

export function listCrmIntegrationConnectors(): CrmIntegrationConnector[] {
  const enabled = isCrmExternalIntegrationsEnabled();
  return CRM_INTEGRATION_CONNECTORS.map((c) => ({
    ...c,
    status: enabled ? "preparing" : "disabled",
  }));
}

export type CrmIntegrationArchitecture = {
  version: "24.0";
  principle: string;
  connectors: CrmIntegrationConnector[];
  notes: string[];
};

export function describeCrmIntegrationArchitecture(): CrmIntegrationArchitecture {
  return {
    version: "24.0",
    principle:
      "Integrações são adapters plugáveis sobre a base única de clientes e eventos CRM — sem duplicar cadastro.",
    connectors: listCrmIntegrationConnectors(),
    notes: [
      "Nenhuma chamada HTTP/WhatsApp/e-mail/telefonia nesta fase.",
      "Flags controlam disponibilidade de UI/contratos.",
      "Eventos e timeline permanecem em cliente_eventos / tarefas / agenda.",
    ],
  };
}
