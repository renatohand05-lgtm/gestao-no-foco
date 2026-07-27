/**
 * Sprint 21.5 — Preferências (modelo + avaliação determinística).
 */

import { MANDATORY_CATEGORIES } from "./categories.ts";
import { isKnownChannel } from "./channels.ts";
import { meetsMinPriority } from "./priorities.ts";
import type {
  NotificationCategoryId,
  NotificationChannelId,
  NotificationPreference,
  NotificationPriorityId,
  NotificationRequest,
} from "./types.ts";

export function createPreference(
  input: Partial<NotificationPreference> & {
    userId?: string | null;
    tenantId?: string | null;
  },
): NotificationPreference {
  return {
    userId: input.userId ?? null,
    tenantId: input.tenantId ?? null,
    enabledChannels: input.enabledChannels ?? ["in_app", "inbox"],
    blockedCategories: input.blockedCategories ?? [],
    minPriority: input.minPriority ?? "low",
    quietHoursStart: input.quietHoursStart ?? null,
    quietHoursEnd: input.quietHoursEnd ?? null,
    timezone: input.timezone ?? null,
    locale: input.locale ?? null,
    frequency: input.frequency ?? "realtime",
    digestEnabled: input.digestEnabled === true,
    optOut: input.optOut === true,
    mandatoryChannels: input.mandatoryChannels ?? [],
    metadata: input.metadata ?? {},
  };
}

function inQuietHours(
  preference: NotificationPreference,
  nowHour: number | null | undefined,
): boolean {
  const start = preference.quietHoursStart;
  const end = preference.quietHoursEnd;
  if (
    start == null ||
    end == null ||
    nowHour == null ||
    !Number.isFinite(nowHour)
  ) {
    return false;
  }
  if (start === end) return false;
  if (start < end) return nowHour >= start && nowHour < end;
  // overnight window e.g. 22-6
  return nowHour >= start || nowHour < end;
}

export type PreferenceEvalResult = {
  allowed: boolean;
  channels: NotificationChannelId[];
  reasons: string[];
};

/**
 * Avalia preferências. Critical/mandatory podem ignorar opt-out e quiet hours.
 */
export function evaluatePreferences(
  request: Pick<
    NotificationRequest,
    "category" | "priority" | "channels" | "mandatory"
  >,
  preference: NotificationPreference | null | undefined,
  options?: { nowHour?: number | null },
): PreferenceEvalResult {
  const reasons: string[] = [];
  const mandatory =
    request.mandatory ||
    MANDATORY_CATEGORIES.includes(request.category) ||
    request.priority === "critical";

  if (!preference) {
    return {
      allowed: true,
      channels: [...request.channels],
      reasons: ["no_preferences"],
    };
  }

  if (preference.optOut && !mandatory) {
    return { allowed: false, channels: [], reasons: ["opt_out"] };
  }

  if (preference.blockedCategories.includes(request.category) && !mandatory) {
    return { allowed: false, channels: [], reasons: ["category_blocked"] };
  }

  if (
    !meetsMinPriority(
      request.priority as NotificationPriorityId,
      preference.minPriority,
    ) &&
    !mandatory
  ) {
    return { allowed: false, channels: [], reasons: ["below_min_priority"] };
  }

  if (inQuietHours(preference, options?.nowHour) && !mandatory) {
    return { allowed: false, channels: [], reasons: ["quiet_hours"] };
  }

  const enabled = new Set(
    preference.enabledChannels.filter((c) => isKnownChannel(c)),
  );
  for (const ch of preference.mandatoryChannels ?? []) {
    if (isKnownChannel(ch)) enabled.add(ch);
  }

  let channels = request.channels.filter((c) => enabled.has(c));

  if (mandatory) {
    // restore requested channels that were mandatory/security
    channels = [...new Set([...channels, ...request.channels])];
    reasons.push("mandatory_override");
  }

  if (channels.length === 0) {
    return { allowed: false, channels: [], reasons: ["no_enabled_channels"] };
  }

  reasons.push("preferences_applied");
  return { allowed: true, channels, reasons };
}

export function isCategoryBlocked(
  preference: NotificationPreference,
  category: NotificationCategoryId,
): boolean {
  return preference.blockedCategories.includes(category);
}
