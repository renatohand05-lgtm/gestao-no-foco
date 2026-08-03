"use server";

/**
 * Sprint 30.8 — Server actions Integration Hub (somente leitura / mock).
 */

import { getCachedIntegrationHubSnapshot } from "./compose-hub.ts";
import { requireIntegracoesAccess } from "./page-auth.ts";
import {
  assertNoActiveMarketplace,
} from "./marketplace-catalog.ts";
import { assertNoRealApiTokens } from "./api-center.ts";
import { assertNoSecretStorage } from "./connection-manager.ts";
import {
  EVENT_BUS_CAPABILITIES,
} from "./event-bus.ts";
import { SCHEDULER_CAPABILITIES } from "./scheduler.ts";

export async function getIntegrationHubAction(tenantSlug: string) {
  try {
    const auth = await requireIntegracoesAccess(tenantSlug);
    const snapshot = await getCachedIntegrationHubSnapshot(auth.tenant.id);
    return {
      success: true as const,
      snapshot,
      guarantees: {
        noActiveMarketplace: assertNoActiveMarketplace(),
        noRealTokens: assertNoRealApiTokens(),
        noSecretStorage: assertNoSecretStorage(),
        noExternalScheduler: !SCHEDULER_CAPABILITIES.executesExternally,
        noExternalEventDispatch: !EVENT_BUS_CAPABILITIES.externalDispatch,
        liveExternalCalls: snapshot.liveExternalCalls,
        credentialsStored: snapshot.credentialsStored,
        activeWebhooks: snapshot.activeWebhooks,
      },
    };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error
          ? error.message
          : "Falha ao carregar Integration Hub.",
    };
  }
}
