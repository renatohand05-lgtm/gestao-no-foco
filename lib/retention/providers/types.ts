/**
 * Sprint 35.2.2 — Contrato de provider. Sem acoplar regras à Meta.
 */

import type { CommChannel, OutboxStatus } from "../channels.ts";
import type { ProviderHealthStatus } from "./runtime.ts";

export type ProviderSendInput = {
  to: string;
  body: string;
  tenantId: string;
};

export type ProviderSendResult = {
  simulated: boolean;
  status: OutboxStatus;
  provider: string;
  providerMessageId?: string;
  errorCode?: string;
  message: string;
};

export type ProviderStatusResult = {
  status: OutboxStatus | "unknown";
  providerMessageId: string;
};

export type WebhookHandleResult = {
  duplicated: boolean;
  eventId: string;
  kind: "status" | "inbound" | "ignored";
  providerMessageId?: string;
  mappedStatus?: OutboxStatus;
  inboundText?: string;
  fromAddress?: string;
};

export type NotificationProvider = {
  id: string;
  channel: CommChannel;
  send(input: ProviderSendInput): Promise<ProviderSendResult>;
  getStatus(messageId: string): Promise<ProviderStatusResult>;
  handleWebhook?(rawBody: string, headers: Record<string, string>): Promise<WebhookHandleResult>;
  validateConfiguration(): {
    status: ProviderHealthStatus;
    notes: string[];
  };
};
