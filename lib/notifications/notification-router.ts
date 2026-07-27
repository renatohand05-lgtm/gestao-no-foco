/**
 * Sprint 21.5 — Router determinístico de canais.
 */

import {
  CRITICAL_CHANNEL_ORDER,
  NORMAL_CHANNEL_ORDER,
  isKnownChannel,
} from "./channels.ts";
import { evaluatePreferences } from "./notification-preferences.ts";
import type {
  NotificationChannelId,
  NotificationPreference,
  NotificationPriorityId,
  NotificationRequest,
} from "./types.ts";

export type RouteResult = {
  channels: NotificationChannelId[];
  suppressed: boolean;
  reasons: string[];
};

function orderChannels(
  channels: readonly NotificationChannelId[],
  priority: NotificationPriorityId,
): NotificationChannelId[] {
  const order =
    priority === "critical" || priority === "urgent"
      ? CRITICAL_CHANNEL_ORDER
      : NORMAL_CHANNEL_ORDER;

  const set = new Set(channels.filter(isKnownChannel));
  const ordered: NotificationChannelId[] = [];
  for (const ch of order) {
    if (set.has(ch)) ordered.push(ch);
  }
  // append any remaining (webhook/sms) in stable alpha order
  const rest = [...set].filter((c) => !ordered.includes(c)).sort();
  return [...ordered, ...rest];
}

export function routeNotification(
  request: NotificationRequest,
  preference?: NotificationPreference | null,
  options?: { nowHour?: number | null },
): RouteResult {
  const pref = evaluatePreferences(request, preference, {
    nowHour: options?.nowHour,
  });

  if (!pref.allowed) {
    return {
      channels: [],
      suppressed: true,
      reasons: pref.reasons,
    };
  }

  const channels = orderChannels(pref.channels, request.priority);
  if (channels.length === 0) {
    return {
      channels: [],
      suppressed: true,
      reasons: [...pref.reasons, "no_routable_channels"],
    };
  }

  // fallback: if email requested but missing, keep in_app/inbox already present
  const reasons = [...pref.reasons, `routed:${channels.join(",")}`];
  return { channels, suppressed: false, reasons };
}

export function getAvailableChannels(
  request: NotificationRequest,
  preference?: NotificationPreference | null,
  options?: { nowHour?: number | null },
): NotificationChannelId[] {
  return routeNotification(request, preference, options).channels;
}
