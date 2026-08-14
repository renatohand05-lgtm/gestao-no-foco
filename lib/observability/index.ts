/**
 * Sprint 21.9 — Enterprise Observability · API pública.
 * Domínio de diagnóstico — sem React · sem SQL · sem mutação de engines.
 */

export type {
  LatencyStats,
  ObservabilityAlert,
  ObservabilityAlertKind,
  ObservabilityFilters,
  ObservabilityHealthStatus,
  ObservabilityKpis,
  ObservabilityMetrics,
  ObservabilityServiceName,
  ObservabilitySeverity,
  ObservabilitySnapshot,
  ServiceHealth,
  StructuredLogEntry,
  SystemHealth,
  TraceSpan,
} from "./observability-types.ts";

export {
  OBSERVABILITY_ERROR_CODES,
  ObservabilityError,
  isObservabilityError,
  type ObservabilityErrorCode,
} from "./observability-errors.ts";

export {
  OBSERVABILITY_READ_PERMISSIONS,
  hasObservabilityReadPermission,
  mergeObservabilityContext,
  type ObservabilityAuthorizationSnapshot,
} from "./observability-context.ts";

export {
  assertObservabilityActor,
  assertObservabilityReadPermission,
  assertObservabilityTenant,
} from "./observability-validator.ts";

export {
  computeLatencyStats,
  filterAlerts,
  filterLogs,
  filterTraces,
  percentile,
} from "./observability-filters.ts";

export {
  createLoggingService,
  type LoggingService,
  type LogInput,
} from "./logging-service.ts";

export {
  createTraceService,
  type TraceService,
  type TraceStartInput,
} from "./trace-service.ts";

export {
  createMetricsService,
  type MetricsService,
  type MetricSample,
} from "./metrics-service.ts";

export {
  createHealthService,
  type HealthService,
  type HealthServiceDeps,
  type HealthProbeResult,
} from "./health-service.ts";

export {
  createAlertService,
  type AlertService,
} from "./alert-service.ts";

export {
  createDiagnosticsService,
  type DiagnosticsService,
  type DiagnosticsReport,
} from "./diagnostics-service.ts";

export {
  createStatusService,
  type StatusService,
} from "./status-service.ts";

export {
  createObservabilityService,
  type ObservabilityService,
  type ObservabilityServiceDeps,
} from "./observability-service.ts";

/** Legado Sprint 13.21 — mantido. */
export { logger, sanitizeContext, type LogLevel, type LogContext } from "./logger.ts";
export {
  CORRELATION_ID_HEADER,
  REQUEST_ID_HEADER,
  requestIdHeaders,
  resolveRequestId,
} from "./request-id.ts";
export { withTiming, createRequestTimer } from "./perf.ts";
