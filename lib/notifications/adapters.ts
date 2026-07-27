/**
 * Sprint 21.5 — Adapters simulados (sem I/O externo).
 */

import type {
  NotificationAdapter,
  NotificationAdapterResult,
  NotificationChannelId,
} from "./types.ts";

function simulated(
  channel: NotificationChannelId,
  ok = true,
  message = "Simulado · sem envio externo",
): NotificationAdapterResult {
  return {
    ok,
    channel,
    status: ok ? "sent" : "failed",
    message,
    simulated: true,
    payload: { simulated: true },
  };
}

export const InAppNotificationAdapter: NotificationAdapter = {
  channel: "in_app",
  dispatch: () => simulated("in_app"),
};

export const InboxNotificationAdapter: NotificationAdapter = {
  channel: "inbox",
  dispatch: () => simulated("inbox"),
};

export const EmailNotificationAdapter: NotificationAdapter = {
  channel: "email",
  dispatch: () => simulated("email", true, "E-mail simulado · não enviado"),
};

export const PushNotificationAdapter: NotificationAdapter = {
  channel: "push",
  dispatch: () => simulated("push", true, "Push simulado · não enviado"),
};

export const WebhookNotificationAdapter: NotificationAdapter = {
  channel: "webhook",
  dispatch: () => simulated("webhook", true, "Webhook simulado · não chamado"),
};

export const SmsPlaceholderAdapter: NotificationAdapter = {
  channel: "sms_placeholder",
  dispatch: () =>
    simulated("sms_placeholder", true, "SMS placeholder · não enviado"),
};

export const DEFAULT_ADAPTERS: readonly NotificationAdapter[] = [
  InAppNotificationAdapter,
  InboxNotificationAdapter,
  EmailNotificationAdapter,
  PushNotificationAdapter,
  WebhookNotificationAdapter,
  SmsPlaceholderAdapter,
];

export function getAdapterMap(
  adapters: readonly NotificationAdapter[] = DEFAULT_ADAPTERS,
): Map<NotificationChannelId, NotificationAdapter> {
  return new Map(adapters.map((a) => [a.channel, a]));
}
