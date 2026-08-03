/**
 * Sprint 30.8.1 — Garantias de segurança / no external I/O.
 */

import { assertApiCenterNonOperational, assertNoRealApiTokens } from "./api-center.ts";
import { assertNoSecretStorage } from "./connection-manager.ts";
import { composeIntegrationHubSnapshot } from "./compose-hub.ts";
import { EVENT_BUS_CAPABILITIES } from "./event-bus.ts";
import { assertNoActiveMarketplace } from "./marketplace-catalog.ts";
import { SCHEDULER_CAPABILITIES } from "./scheduler.ts";

export type IntegrationSecurityReport = {
  liveExternalCalls: false;
  credentialsStored: false;
  activeWebhooks: false;
  noActiveMarketplace: boolean;
  noRealTokens: boolean;
  noSecretStorage: boolean;
  noExternalScheduler: boolean;
  noExternalEventDispatch: boolean;
  apiNonOperational: boolean;
  ok: boolean;
};

export function auditIntegrationSecurity(
  tenantId = "audit-tenant",
): IntegrationSecurityReport {
  const snap = composeIntegrationHubSnapshot(tenantId);
  const report: IntegrationSecurityReport = {
    liveExternalCalls: snap.liveExternalCalls,
    credentialsStored: snap.credentialsStored,
    activeWebhooks: snap.activeWebhooks,
    noActiveMarketplace: assertNoActiveMarketplace(),
    noRealTokens: assertNoRealApiTokens(),
    noSecretStorage: assertNoSecretStorage(),
    noExternalScheduler: !SCHEDULER_CAPABILITIES.executesExternally,
    noExternalEventDispatch: !EVENT_BUS_CAPABILITIES.externalDispatch,
    apiNonOperational: assertApiCenterNonOperational(),
    ok: false,
  };
  report.ok =
    report.liveExternalCalls === false &&
    report.credentialsStored === false &&
    report.activeWebhooks === false &&
    report.noActiveMarketplace &&
    report.noRealTokens &&
    report.noSecretStorage &&
    report.noExternalScheduler &&
    report.noExternalEventDispatch &&
    report.apiNonOperational;
  return report;
}

/** Isolamento: snapshot carrega tenantId explícito; catálogo é compartilhado sem dados privados. */
export function assertTenantIsolationSnapshots(
  tenantA: string,
  tenantB: string,
): boolean {
  const a = composeIntegrationHubSnapshot(tenantA);
  const b = composeIntegrationHubSnapshot(tenantB);
  if (a.tenantId !== tenantA || b.tenantId !== tenantB) return false;
  if (a.tenantId === b.tenantId) return false;
  // Catálogo comum (mesmo tamanho), sem payload privado por tenant
  if (a.marketplace.length !== b.marketplace.length) return false;
  if (a.credentialsStored || b.credentialsStored) return false;
  if (a.liveExternalCalls || b.liveExternalCalls) return false;
  return true;
}
