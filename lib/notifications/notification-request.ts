/**
 * Sprint 21.5 — Criação/normalização de NotificationRequest.
 */

import { isKnownChannel } from "./channels.ts";
import { getNotificationEvent, isKnownNotificationEvent } from "./events.ts";
import { normalizeRecipients } from "./notification-recipient.ts";
import { InvalidNotificationRequestError } from "./notification-errors.ts";
import { validateNotificationRequest } from "./notification-validation.ts";
import type {
  DeduplicationMode,
  NotificationAction,
  NotificationChannelId,
  NotificationContext,
  NotificationRecipient,
  NotificationRequest,
} from "./types.ts";

let seq = 0;

export type CreateNotificationRequestInput = {
  tenantId?: string | null;
  event: string;
  category?: string;
  priority?: string;
  channels?: readonly string[];
  recipients: readonly NotificationRecipient[];
  templateId?: string | null;
  variables?: Record<string, unknown>;
  title?: string | null;
  message?: string | null;
  actions?: readonly NotificationAction[];
  metadata?: Record<string, unknown>;
  source?: string | null;
  correlationId?: string | null;
  requestId?: string | null;
  scheduledAt?: string | null;
  expiresAt?: string | null;
  deduplicationKey?: string | null;
  deduplicationMode?: DeduplicationMode;
  mandatory?: boolean;
  id?: string;
  now?: string | Date;
  context?: NotificationContext | null;
  strict?: boolean;
};

export function createNotificationRequest(
  input: CreateNotificationRequestInput,
): NotificationRequest {
  seq += 1;
  const now =
    input.now instanceof Date
      ? input.now.toISOString()
      : typeof input.now === "string"
        ? new Date(input.now).toISOString()
        : new Date().toISOString();

  const tenantId =
    (input.tenantId ?? input.context?.tenantId)?.trim() || "";

  if (!isKnownNotificationEvent(input.event)) {
    if (input.strict !== false) {
      throw new InvalidNotificationRequestError(
        `Evento inválido: ${input.event}`,
      );
    }
  }

  const eventDef = getNotificationEvent(input.event);
  const recipients = normalizeRecipients(input.recipients);

  const channels = (
    input.channels?.length
      ? input.channels
      : (eventDef?.defaultChannels ?? ["in_app", "inbox"])
  ).filter((c): c is NotificationChannelId => isKnownChannel(c));

  const request: NotificationRequest = {
    id:
      input.id?.trim() ||
      `notif_${seq}_${Math.random().toString(36).slice(2, 8)}`,
    tenantId,
    event: input.event.trim(),
    category: (input.category as NotificationRequest["category"]) ||
      eventDef?.defaultCategory ||
      "system",
    priority: (input.priority as NotificationRequest["priority"]) ||
      eventDef?.defaultPriority ||
      "normal",
    channels,
    recipients,
    templateId: input.templateId?.trim() || null,
    variables: {
      ...(input.context?.variables ?? {}),
      ...(input.variables ?? {}),
    },
    title: input.title?.trim() || null,
    message: input.message?.trim() || null,
    actions: input.actions ? [...input.actions] : [],
    metadata: { ...(input.metadata ?? {}) },
    source: input.source ?? input.context?.source ?? null,
    correlationId:
      input.correlationId ?? input.context?.correlationId ?? null,
    requestId: input.requestId ?? input.context?.requestId ?? null,
    scheduledAt: input.scheduledAt ?? null,
    expiresAt: input.expiresAt ?? null,
    deduplicationKey: input.deduplicationKey?.trim() || null,
    deduplicationMode: input.deduplicationMode ?? "suppress",
    mandatory: input.mandatory ?? eventDef?.mandatory === true,
    createdAt: now,
  };

  const validation = validateNotificationRequest(request);
  if (!validation.valid && input.strict !== false) {
    throw new InvalidNotificationRequestError(
      validation.issues[0]?.message ?? "Request inválida.",
    );
  }

  return request;
}

export function __resetNotificationSeqForTests(): void {
  seq = 0;
}
