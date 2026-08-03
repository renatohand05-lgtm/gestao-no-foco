/**
 * Sprint 30.8 — Compose Integration Hub snapshot (puro / determinístico).
 */

import { cache } from "react";

import { INTERNAL_API_CATALOG } from "./api-center.ts";
import { CONNECTION_BLUEPRINTS } from "./connection-manager.ts";
import { EVENT_BUS_MOCK } from "./event-bus.ts";
import { MARKETPLACE_CATALOG } from "./marketplace-catalog.ts";
import {
  CONFIG_KNOBS,
  INTEGRATION_LOGS_MOCK,
  buildMonitorMetrics,
} from "./observability.ts";
import { SCHEDULER_JOBS_MOCK } from "./scheduler.ts";
import type { IntegrationHubSnapshot } from "./types.ts";
import { WEBHOOK_MOCKS } from "./webhook-center.ts";

export function composeIntegrationHubSnapshot(
  tenantId: string,
): IntegrationHubSnapshot {
  const pending = MARKETPLACE_CATALOG.length;
  const errors = WEBHOOK_MOCKS.filter((w) => w.status === "dlq_mock").length;
  const fila = WEBHOOK_MOCKS.filter((w) => w.status === "queued").length;

  return {
    tenantId,
    generatedAt: new Date().toISOString(),
    liveExternalCalls: false,
    credentialsStored: false,
    activeWebhooks: false,
    dashboard: {
      statusGeral: "arquitetura_pronta",
      integracoesAtivas: 0,
      integracoesPendentes: pending,
      erros: errors,
      ultimaSincronizacao: null,
      tempoMedioMs: null,
      filaEventos: fila,
      healthScore: 92,
      healthLabel: "Arquitetura saudável — sem I/O externo",
    },
    marketplace: [...MARKETPLACE_CATALOG],
    apiCenter: [...INTERNAL_API_CATALOG],
    connections: [...CONNECTION_BLUEPRINTS],
    webhooks: [...WEBHOOK_MOCKS],
    scheduler: [...SCHEDULER_JOBS_MOCK],
    events: [...EVENT_BUS_MOCK],
    logs: [...INTEGRATION_LOGS_MOCK],
    monitor: buildMonitorMetrics(),
    config: [...CONFIG_KNOBS],
  };
}

/** Dedup por request (tenant). */
export const getCachedIntegrationHubSnapshot = cache(
  async (tenantId: string) => composeIntegrationHubSnapshot(tenantId),
);
