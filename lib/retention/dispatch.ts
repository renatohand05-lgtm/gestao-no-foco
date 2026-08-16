/**
 * Sprint 35.2.2 — despacho de provider.
 * Cron de produção permanece DISABLED: este módulo não é chamado pelo process.ts.
 */

import type { OutboxStatus } from "./channels.ts";
import { canRetryFailed, shouldHaltRateLimit } from "./rate-limit.ts";
import { createChannelProvider } from "./providers/factory.ts";
import {
  effectiveEmailMode,
  effectiveWhatsAppMode,
} from "./providers/runtime.ts";
import { allowRealProviderSend } from "./test-mode.ts";
import { logCommunication } from "./observability.ts";
import type { ProviderSendResult } from "./providers/types.ts";

export function shouldDispatchReal(input: {
  channel: "whatsapp" | "email";
  to?: string;
}): boolean {
  const phone = input.channel === "whatsapp" ? input.to : null;
  const email = input.channel === "email" ? input.to : null;
  if (!allowRealProviderSend({ channel: input.channel, phone, email })) {
    return false;
  }
  if (input.channel === "whatsapp") {
    return effectiveWhatsAppMode() === "meta_cloud";
  }
  return effectiveEmailMode() === "provider";
}

export function mapSendToOutboxPatch(
  result: ProviderSendResult,
): {
  status: OutboxStatus;
  provider: string;
  providerMessageId: string | null;
  errorCode: string | null;
  sentAt: string | null;
  failedAt: string | null;
} {
  const now = new Date().toISOString();
  const sent =
    result.status === "sent" ||
    result.status === "delivered" ||
    result.status === "read";
  return {
    status: result.status,
    provider: result.provider,
    providerMessageId: result.providerMessageId ?? null,
    errorCode: result.errorCode ?? null,
    sentAt: sent ? now : null,
    failedAt: result.status === "failed" ? now : null,
  };
}

export async function sendViaChannelProvider(input: {
  channel: "whatsapp" | "email";
  to: string;
  body: string;
  tenantId: string;
}): Promise<ProviderSendResult> {
  if (!shouldDispatchReal({ channel: input.channel, to: input.to })) {
    const provider = createChannelProvider(input.channel);
    const result = await provider.send({
      to: input.to,
      body: input.body,
      tenantId: input.tenantId,
    });
    logCommunication({
      event: "provider_request",
      tenantId: input.tenantId,
      channel: input.channel,
      status: result.status,
      note: "blocked_or_test",
    });
    return result;
  }
  const provider = createChannelProvider(input.channel);
  logCommunication({
    event: "provider_request",
    tenantId: input.tenantId,
    channel: input.channel,
  });
  const result = await provider.send({
    to: input.to,
    body: input.body,
    tenantId: input.tenantId,
  });
  logCommunication({
    event: result.status === "failed" ? "failed" : "provider_accepted",
    tenantId: input.tenantId,
    channel: input.channel,
    status: result.status,
  });
  return result;
}

export function retryOrHalt(input: {
  attemptCount: number;
  lastAttemptAt?: string | null;
  sentLastHour: number;
}): { retry: boolean; halt: boolean; note: string } {
  const limit = shouldHaltRateLimit({ sentLastHour: input.sentLastHour });
  if (limit.halt) return { retry: false, halt: true, note: limit.note };
  if (!canRetryFailed({ attemptCount: input.attemptCount, lastAttemptAt: input.lastAttemptAt })) {
    return { retry: false, halt: false, note: "Retry esgotado." };
  }
  return { retry: true, halt: false, note: "" };
}
