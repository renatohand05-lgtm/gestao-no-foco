/**
 * Sprint 30.8 — Logs / Monitor / Config (mock, tenant-scoped).
 */

import type {
  ConfigKnob,
  IntegrationLogEntry,
  MonitorMetric,
} from "./types.ts";

export const INTEGRATION_LOGS_MOCK: readonly IntegrationLogEntry[] = [
  {
    id: "log-1",
    area: "api",
    level: "info",
    message: "API Center consultado (documentação).",
    latencyMs: 12,
    tenantScoped: true,
    userId: null,
    createdAt: "2026-08-03T12:00:00.000Z",
    payloadRedacted: true,
  },
  {
    id: "log-2",
    area: "webhook",
    level: "warn",
    message: "Webhook mock enfileirado — sem entrega externa.",
    latencyMs: null,
    tenantScoped: true,
    userId: null,
    createdAt: "2026-08-03T12:01:00.000Z",
    payloadRedacted: true,
  },
  {
    id: "log-3",
    area: "job",
    level: "info",
    message: "Scheduler idle — executaExternamente=false.",
    latencyMs: 3,
    tenantScoped: true,
    userId: null,
    createdAt: "2026-08-03T12:02:00.000Z",
    payloadRedacted: true,
  },
  {
    id: "log-4",
    area: "evento",
    level: "error",
    message: "Evento externo planejado permanece em DLQ mock.",
    latencyMs: 40,
    tenantScoped: true,
    userId: null,
    createdAt: "2026-08-03T11:50:00.000Z",
    payloadRedacted: true,
  },
] as const;

export function buildMonitorMetrics(): MonitorMetric[] {
  return [
    { id: "health", label: "Health", value: "Arquitetura OK", tone: "ok" },
    { id: "avail", label: "Disponibilidade", value: "100% (local)", tone: "ok" },
    { id: "latency", label: "Latência", value: "— (sem I/O externo)", tone: "neutral" },
    { id: "queue", label: "Fila", value: "0 externa", tone: "ok" },
    { id: "events", label: "Eventos", value: "mock", tone: "neutral" },
    { id: "scheduler", label: "Scheduler", value: "idle", tone: "ok" },
    { id: "webhook", label: "Webhook", value: "0 ativos", tone: "ok" },
    { id: "api", label: "API", value: "documentada", tone: "ok" },
    { id: "workers", label: "Workers", value: "0 externos", tone: "ok" },
  ];
}

export const CONFIG_KNOBS: readonly ConfigKnob[] = [
  {
    id: "rate-limit",
    label: "Rate limit",
    value: "60/min (planejado)",
    description: "Limite futuro por tenant/API.",
    mutableInUi: false,
  },
  {
    id: "timeout",
    label: "Timeout",
    value: "10s (planejado)",
    description: "Timeout de conectores futuros.",
    mutableInUi: false,
  },
  {
    id: "retry",
    label: "Retry",
    value: "3 × backoff",
    description: "Política de retry arquitetural.",
    mutableInUi: false,
  },
  {
    id: "cache",
    label: "Cache",
    value: "TTL 15s hub",
    description: "Cache de leitura do hub.",
    mutableInUi: false,
  },
  {
    id: "concurrency",
    label: "Concurrency",
    value: "2 (planejado)",
    description: "Workers futuros.",
    mutableInUi: false,
  },
  {
    id: "flags",
    label: "Feature Flags",
    value: "EXTERNAL_OFF",
    description: "Flags de I/O externo permanecem OFF.",
    mutableInUi: false,
  },
  {
    id: "circuit",
    label: "Circuit Breaker",
    value: "open_for_external",
    description: "Breaker aberto para chamadas externas.",
    mutableInUi: false,
  },
] as const;
