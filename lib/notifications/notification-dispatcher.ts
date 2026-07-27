/**
 * Sprint 21.5 — Dispatcher abstrato.
 */

import { getAdapterMap, DEFAULT_ADAPTERS } from "./adapters.ts";
import { createDeliveryAttempt } from "./notification-retry.ts";
import type {
  NotificationAdapter,
  NotificationAdapterResult,
  NotificationChannelId,
  NotificationDeliveryAttempt,
  NotificationRecipient,
  NotificationRequest,
} from "./types.ts";

export type DispatchInput = {
  request: NotificationRequest;
  channels: readonly NotificationChannelId[];
  recipients: readonly NotificationRecipient[];
  title: string;
  message: string;
  adapters?: readonly NotificationAdapter[];
};

export type DispatchOutput = {
  results: NotificationAdapterResult[];
  attempts: NotificationDeliveryAttempt[];
  missingAdapters: NotificationChannelId[];
};

export function dispatchNotification(input: DispatchInput): DispatchOutput {
  const map = getAdapterMap(input.adapters ?? DEFAULT_ADAPTERS);
  const results: NotificationAdapterResult[] = [];
  const attempts: NotificationDeliveryAttempt[] = [];
  const missingAdapters: NotificationChannelId[] = [];
  const now = new Date().toISOString();

  for (const channel of input.channels) {
    const adapter = map.get(channel);
    if (!adapter) {
      missingAdapters.push(channel);
      results.push({
        ok: false,
        channel,
        status: "failed",
        message: "Canal sem adapter",
        simulated: true,
      });
      continue;
    }

    for (const recipient of input.recipients) {
      const result = adapter.dispatch({
        request: input.request,
        recipient,
        title: input.title,
        message: input.message,
      });
      results.push(result);
      attempts.push(
        createDeliveryAttempt({
          channel,
          recipientId: recipient.id,
          status: result.ok ? "sent" : "failed",
          lastError: result.ok ? null : result.message,
          now,
        }),
      );
    }
  }

  return { results, attempts, missingAdapters };
}
