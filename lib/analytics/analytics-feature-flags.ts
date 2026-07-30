/**
 * Fase 23 — Feature flags Analytics.
 */

function envFlag(name: string, defaultOn = false): boolean {
  const raw = process.env[name];
  if (raw == null || raw.trim() === "") return defaultOn;
  const v = raw.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

export function isAnalyticsEnabled(): boolean {
  return envFlag("ANALYTICS_ENABLED", true);
}

export function isAnalyticsExternalAiEnabled(): boolean {
  return envFlag("ANALYTICS_EXTERNAL_AI_ENABLED", false);
}

export function isAnalyticsExportExcelEnabled(): boolean {
  return envFlag("ANALYTICS_EXPORT_EXCEL_ENABLED", false);
}

export function isAnalyticsExportPdfEnabled(): boolean {
  return envFlag("ANALYTICS_EXPORT_PDF_ENABLED", false);
}

export function getAnalyticsFeatureFlags() {
  return {
    analytics: isAnalyticsEnabled(),
    externalAi: isAnalyticsExternalAiEnabled(),
    exportExcel: isAnalyticsExportExcelEnabled(),
    exportPdf: isAnalyticsExportPdfEnabled(),
  };
}
