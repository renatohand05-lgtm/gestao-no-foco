/**
 * Sprint 30.8 — Scheduler engine architecture (mock jobs).
 */

import type { SchedulerJobMock } from "./types.ts";

export const SCHEDULER_JOBS_MOCK: readonly SchedulerJobMock[] = [
  {
    id: "job-sync-catalog",
    name: "Sincronização de catálogo (planejada)",
    schedule: "0 */6 * * *",
    priority: "media",
    status: "scheduled",
    concurrency: 1,
    backoffMs: 5000,
    nextRunAt: null,
  },
  {
    id: "job-outbox-drain",
    name: "Drain outbox enterprise",
    schedule: "*/5 * * * *",
    priority: "alta",
    status: "idle",
    concurrency: 2,
    backoffMs: 2000,
    nextRunAt: null,
  },
  {
    id: "job-webhook-retry",
    name: "Retry webhooks (mock)",
    schedule: "*/15 * * * *",
    priority: "media",
    status: "cancelled",
    concurrency: 1,
    backoffMs: 10000,
    nextRunAt: null,
  },
] as const;

export type SchedulerCapabilities = {
  sync: true;
  queue: true;
  jobs: true;
  schedule: true;
  backoff: true;
  retry: true;
  priority: true;
  concurrency: true;
  cancel: true;
  monitor: true;
  executesExternally: false;
};

export const SCHEDULER_CAPABILITIES: SchedulerCapabilities = {
  sync: true,
  queue: true,
  jobs: true,
  schedule: true,
  backoff: true,
  retry: true,
  priority: true,
  concurrency: true,
  cancel: true,
  monitor: true,
  executesExternally: false,
};
