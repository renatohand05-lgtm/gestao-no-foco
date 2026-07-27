/**
 * Sprint 21.9 — Structured Logging Service.
 * Padroniza campos mínimos · reutiliza sanitize do logger legado.
 */

import { sanitizeContext } from "./logger.ts";
import type {
  ObservabilitySeverity,
  StructuredLogEntry,
} from "./observability-types.ts";
import { filterLogs } from "./observability-filters.ts";
import type { ObservabilityFilters } from "./observability-types.ts";

const MAX_LOGS = 500;

export type LoggingServiceDeps = {
  /** Buffer opcional injetável (testes). */
  store?: StructuredLogEntry[];
};

export type LogInput = {
  tenantId?: string | null;
  module: string;
  action: string;
  actor?: string | null;
  severity?: ObservabilitySeverity;
  correlationId?: string | null;
  duration?: number | null;
  status?: string;
  metadata?: Record<string, unknown>;
  message?: string;
};

export function createLoggingService(deps: LoggingServiceDeps = {}) {
  const store = deps.store ?? [];

  function append(entry: StructuredLogEntry) {
    store.push(entry);
    if (store.length > MAX_LOGS) store.splice(0, store.length - MAX_LOGS);
  }

  return {
    log(input: LogInput): StructuredLogEntry {
      const entry: StructuredLogEntry = {
        timestamp: new Date().toISOString(),
        tenantId: input.tenantId ?? null,
        module: input.module,
        action: input.action,
        actor: input.actor ?? null,
        severity: input.severity ?? "info",
        correlationId: input.correlationId ?? null,
        duration: input.duration ?? null,
        status: input.status ?? "ok",
        metadata: sanitizeContext(input.metadata) ?? {},
        message: input.message,
      };
      append(entry);
      return entry;
    },

    list(
      tenantId: string,
      filters: ObservabilityFilters = {},
    ): StructuredLogEntry[] {
      return filterLogs(store, { ...filters, tenantId }).slice().reverse();
    },

    clear() {
      store.length = 0;
    },

    /** Exposto para testes. */
    _store: store,
  };
}

export type LoggingService = ReturnType<typeof createLoggingService>;
