/**
 * Sprint 30.8 — Event Bus architecture (mock + referência outbox).
 */

import type { EventBusRecord } from "./types.ts";

export const EVENT_BUS_MOCK: readonly EventBusRecord[] = [
  {
    id: "evt-1",
    kind: "internal",
    name: "tenant.member.invited",
    status: "published_mock",
    idempotencyKey: "idem-member-invited-1",
    createdAt: "2026-08-03T10:00:00.000Z",
  },
  {
    id: "evt-2",
    kind: "internal",
    name: "automation.dry_run.completed",
    status: "consumed_mock",
    idempotencyKey: "idem-auto-dry-1",
    createdAt: "2026-08-03T11:00:00.000Z",
  },
  {
    id: "evt-3",
    kind: "external_planned",
    name: "erp.omie.sync.planned",
    status: "dlq_mock",
    idempotencyKey: "idem-omie-planned-1",
    createdAt: "2026-08-03T09:00:00.000Z",
  },
  {
    id: "evt-4",
    kind: "internal",
    name: "analytics.bundle.refreshed",
    status: "replay_ready",
    idempotencyKey: "idem-analytics-1",
    createdAt: "2026-08-03T12:00:00.000Z",
  },
] as const;

export type EventBusCapabilities = {
  publisher: true;
  consumer: true;
  history: true;
  idempotency: true;
  queue: true;
  deadLetter: true;
  replay: true;
  externalDispatch: false;
};

export const EVENT_BUS_CAPABILITIES: EventBusCapabilities = {
  publisher: true,
  consumer: true,
  history: true,
  idempotency: true,
  queue: true,
  deadLetter: true,
  replay: true,
  externalDispatch: false,
};
