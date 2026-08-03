/**
 * Sprint 30.8 — Webhook Center mock (sem entrega real).
 */

import type { WebhookMockRecord } from "./types.ts";

export const WEBHOOK_MOCKS: readonly WebhookMockRecord[] = [
  {
    id: "wh-in-1",
    direction: "inbound",
    status: "queued",
    topic: "import.file.received",
    retries: 0,
    createdAt: "2026-08-03T12:00:00.000Z",
    payloadPreview: '{"mock":true,"records":0}',
    headersPreview: { "x-gof-signature": "[redacted]", "content-type": "application/json" },
  },
  {
    id: "wh-out-1",
    direction: "outbound",
    status: "delivered_mock",
    topic: "automation.execution.completed",
    retries: 0,
    createdAt: "2026-08-03T12:05:00.000Z",
    payloadPreview: '{"mock":true,"external":false}',
    headersPreview: { "x-gof-delivery": "mock" },
  },
  {
    id: "wh-dlq-1",
    direction: "outbound",
    status: "dlq_mock",
    topic: "crm.sync.planned",
    retries: 3,
    createdAt: "2026-08-03T11:00:00.000Z",
    payloadPreview: '{"mock":true,"dlq":true}',
    headersPreview: { "x-gof-retry": "3" },
  },
  {
    id: "wh-retry-1",
    direction: "inbound",
    status: "retry_mock",
    topic: "estoque.delta.planned",
    retries: 1,
    createdAt: "2026-08-03T12:10:00.000Z",
    payloadPreview: '{"mock":true,"retry":true}',
    headersPreview: { "x-gof-attempt": "2" },
  },
] as const;

export function listWebhookHistory(): WebhookMockRecord[] {
  return [...WEBHOOK_MOCKS];
}
