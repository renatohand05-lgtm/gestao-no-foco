/**
 * Sprint 21.5 — Canais de notificação.
 */

import type { NotificationChannelId } from "./types.ts";

export const NOTIFICATION_CHANNELS = [
  "in_app",
  "inbox",
  "email",
  "push",
  "webhook",
  "sms_placeholder",
] as const satisfies readonly NotificationChannelId[];

export type ChannelMeta = {
  id: NotificationChannelId;
  label: string;
  external: boolean;
};

export const CHANNEL_CATALOG: readonly ChannelMeta[] = [
  { id: "in_app", label: "In-app", external: false },
  { id: "inbox", label: "Caixa de entrada", external: false },
  { id: "email", label: "E-mail", external: true },
  { id: "push", label: "Push", external: true },
  { id: "webhook", label: "Webhook", external: true },
  { id: "sms_placeholder", label: "SMS (placeholder)", external: true },
] as const;

export function isKnownChannel(value: string): value is NotificationChannelId {
  return (NOTIFICATION_CHANNELS as readonly string[]).includes(value);
}

/** Ordem determinística por prioridade crítica. */
export const CRITICAL_CHANNEL_ORDER: readonly NotificationChannelId[] = [
  "in_app",
  "inbox",
  "email",
  "push",
];

export const NORMAL_CHANNEL_ORDER: readonly NotificationChannelId[] = [
  "in_app",
  "inbox",
];
