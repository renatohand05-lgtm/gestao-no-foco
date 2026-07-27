/**
 * Sprint 21.9 — Trace Service (correlation tracking).
 * Toda operação: traceId · correlationId · requestId.
 */

import { filterTraces } from "./observability-filters.ts";
import type {
  ObservabilityFilters,
  TraceSpan,
} from "./observability-types.ts";

const MAX_TRACES = 400;

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export type TraceStartInput = {
  tenantId?: string | null;
  module: string;
  action: string;
  correlationId?: string | null;
  requestId?: string | null;
  traceId?: string | null;
  metadata?: Record<string, unknown>;
};

export type TraceServiceDeps = {
  store?: TraceSpan[];
};

export function createTraceService(deps: TraceServiceDeps = {}) {
  const store = deps.store ?? [];

  function push(span: TraceSpan) {
    store.push(span);
    if (store.length > MAX_TRACES) store.splice(0, store.length - MAX_TRACES);
  }

  return {
    createIds(input?: {
      correlationId?: string | null;
      requestId?: string | null;
      traceId?: string | null;
    }) {
      return {
        traceId: input?.traceId?.trim() || newId("tr"),
        correlationId: input?.correlationId?.trim() || newId("corr"),
        requestId: input?.requestId?.trim() || newId("req"),
      };
    },

    start(input: TraceStartInput): TraceSpan {
      const ids = this.createIds(input);
      const span: TraceSpan = {
        traceId: ids.traceId,
        correlationId: ids.correlationId,
        requestId: ids.requestId,
        tenantId: input.tenantId ?? null,
        module: input.module,
        action: input.action,
        startedAt: new Date().toISOString(),
        endedAt: null,
        durationMs: null,
        status: "running",
        metadata: input.metadata ?? {},
      };
      push(span);
      return span;
    },

    end(
      traceId: string,
      status: "ok" | "error" = "ok",
      metadata?: Record<string, unknown>,
    ): TraceSpan | null {
      const span = [...store].reverse().find((s) => s.traceId === traceId);
      if (!span) return null;
      const endedAt = new Date().toISOString();
      span.endedAt = endedAt;
      span.durationMs = Math.max(
        0,
        new Date(endedAt).getTime() - new Date(span.startedAt).getTime(),
      );
      span.status = status;
      if (metadata) span.metadata = { ...span.metadata, ...metadata };
      return span;
    },

    getTrace(traceId: string): TraceSpan | null {
      return store.find((s) => s.traceId === traceId) ?? null;
    },

    getByCorrelation(
      tenantId: string,
      correlationId: string,
    ): TraceSpan[] {
      return store.filter(
        (s) =>
          s.tenantId === tenantId && s.correlationId === correlationId,
      );
    },

    list(tenantId: string, filters: ObservabilityFilters = {}): TraceSpan[] {
      return filterTraces(store, { ...filters, tenantId }).slice().reverse();
    },

    clear() {
      store.length = 0;
    },

    _store: store,
  };
}

export type TraceService = ReturnType<typeof createTraceService>;
