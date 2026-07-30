/**
 * Sprint 22.8 — Feature flags da Import Engine Enterprise.
 * Todas default false — só habilitam com env explícito.
 */

function envFlag(name: string): boolean {
  const raw = process.env[name]?.trim().toLowerCase() ?? "";
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

export function isExternalAiEnabled(): boolean {
  return envFlag("IMPORT_EXTERNAL_AI_ENABLED");
}

export function isOcrEnabled(): boolean {
  return envFlag("IMPORT_OCR_ENABLED");
}

export function isCnabEnabled(): boolean {
  return envFlag("IMPORT_CNAB_ENABLED");
}

export function isConnectorsSpecificEnabled(): boolean {
  return envFlag("IMPORT_CONNECTORS_ENABLED");
}

export function isWebhooksEnabled(): boolean {
  return envFlag("WEBHOOK_IMPORT_ENABLED");
}

export function isAutoSyncEnabled(): boolean {
  return envFlag("IMPORT_AUTO_SYNC_ENABLED");
}

export function isImportApiEnabled(): boolean {
  return envFlag("IMPORT_API_ENABLED");
}

/** Processamento assíncrono de importações — não implementado; flag default off. */
export function isAsyncProcessingEnabled(): boolean {
  return envFlag("IMPORT_ASYNC_PROCESSING_ENABLED");
}

export type EnterpriseFeatureFlags = {
  externalAi: boolean;
  ocr: boolean;
  cnab: boolean;
  connectorsSpecific: boolean;
  webhooks: boolean;
  autoSync: boolean;
  importApi: boolean;
  asyncProcessing: boolean;
};

export function getEnterpriseFeatureFlags(): EnterpriseFeatureFlags {
  return {
    externalAi: isExternalAiEnabled(),
    ocr: isOcrEnabled(),
    cnab: isCnabEnabled(),
    connectorsSpecific: isConnectorsSpecificEnabled(),
    webhooks: isWebhooksEnabled(),
    autoSync: isAutoSyncEnabled(),
    importApi: isImportApiEnabled(),
    asyncProcessing: isAsyncProcessingEnabled(),
  };
}
