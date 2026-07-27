/**
 * Sprint 21.5 — Notification Engine (API central).
 */

import { dispatchNotification } from "./notification-dispatcher.ts";
import {
  applyDeduplicationToResult,
  evaluateDeduplication,
  rememberNotification,
} from "./notification-deduplication.ts";
import { appendHistory, freezeHistory } from "./notification-history.ts";
import {
  createAuditIntent,
  createPendingAction,
  emptyResult,
} from "./notification-result.ts";
import { createNotificationRequest } from "./notification-request.ts";
import type { CreateNotificationRequestInput } from "./notification-request.ts";
import { routeNotification } from "./notification-router.ts";
import { validateNotificationRequest } from "./notification-validation.ts";
import {
  ensureDefaultTemplates,
  getTemplateForTenant,
} from "./templates.ts";
import { renderNotificationTemplate } from "./template-renderer.ts";
import type {
  NotificationAdapter,
  NotificationContext,
  NotificationPreference,
  NotificationRequest,
  NotificationResult,
} from "./types.ts";

export type EvaluateOptions = {
  context?: NotificationContext | null;
  preference?: NotificationPreference | null;
  adapters?: readonly NotificationAdapter[];
  dedupeWindowMinutes?: number;
  now?: number;
  renderStrict?: boolean;
};

export function createNotification(
  input: CreateNotificationRequestInput,
): NotificationRequest {
  return createNotificationRequest(input);
}

export function canNotify(
  request: NotificationRequest,
  preference?: NotificationPreference | null,
  options?: { nowHour?: number | null },
): boolean {
  const validation = validateNotificationRequest(request);
  if (!validation.valid) return false;
  const routed = routeNotification(request, preference, options);
  return !routed.suppressed && routed.channels.length > 0;
}

export function cannotNotify(
  request: NotificationRequest,
  preference?: NotificationPreference | null,
  options?: { nowHour?: number | null },
): boolean {
  return !canNotify(request, preference, options);
}

export function getRecipients(request: NotificationRequest) {
  return request.recipients;
}

export function renderNotification(
  request: NotificationRequest,
  options?: { strict?: boolean },
): { title: string; message: string } {
  ensureDefaultTemplates();
  if (request.title && request.message) {
    return { title: request.title, message: request.message };
  }
  if (!request.templateId) {
    return {
      title: request.title ?? request.event,
      message: request.message ?? request.event,
    };
  }
  const template = getTemplateForTenant(
    request.templateId,
    request.tenantId,
  );
  if (!template) {
    return {
      title: request.title ?? request.event,
      message: request.message ?? request.event,
    };
  }
  return renderNotificationTemplate(template, request.variables, {
    strict: options?.strict,
  });
}

export function evaluateNotification(
  request: NotificationRequest,
  options: EvaluateOptions = {},
): NotificationResult {
  const validation = validateNotificationRequest(request);
  if (!validation.valid) {
    return emptyResult(
      request,
      "failed",
      validation.issues[0]?.code ?? "INVALID_REQUEST",
      validation.issues.map((i) => i.message),
    );
  }

  const ctxTenant = options.context?.tenantId?.trim();
  if (ctxTenant && ctxTenant !== request.tenantId) {
    return emptyResult(
      request,
      "failed",
      "TENANT_MISMATCH",
      ["Contexto e request com tenants divergentes."],
    );
  }

  const nowIso = request.createdAt;
  let history = appendHistory([], {
    at: nowIso,
    type: "created",
    message: "Notification created",
    metadata: { correlationId: request.correlationId },
  });

  const dedupe = evaluateDeduplication(request, {
    windowMinutes: options.dedupeWindowMinutes ?? 60,
    now: options.now,
  });

  if (dedupe.action === "suppress") {
    history = appendHistory(history, {
      at: nowIso,
      type: "deduplicated",
      message: `Suppressed duplicate of ${dedupe.previousId}`,
    });
    const suppressed = emptyResult(
      request,
      "deduplicated",
      "DUPLICATE_SUPPRESSED",
      [`dedupe:suppress:${dedupe.previousId}`],
    );
    return {
      ...suppressed,
      ok: true,
      history: freezeHistory(history),
      auditIntent: createAuditIntent(request, [], 0, "NOTIFICATION_DEDUPLICATED"),
      pendingActions: [
        createPendingAction({
          type: "WRITE_AUDIT_EVENT",
          description: "Auditoria de deduplicação",
          payload: { previousId: dedupe.previousId },
          notificationId: request.id,
          tenantId: request.tenantId,
          at: nowIso,
        }),
      ],
      deduplicated: true,
      suppressed: true,
    };
  }

  const routed = routeNotification(request, options.preference, {
    nowHour: options.context?.nowHour,
  });

  history = appendHistory(history, {
    at: nowIso,
    type: "routed",
    message: routed.reasons.join("|"),
  });

  if (routed.suppressed) {
    history = appendHistory(history, {
      at: nowIso,
      type: "suppressed",
      message: routed.reasons.join("|"),
    });
    return {
      ...emptyResult(request, "suppressed", "SUPPRESSED", routed.reasons),
      ok: true,
      history: freezeHistory(history),
      suppressed: true,
      auditIntent: createAuditIntent(
        request,
        [],
        request.recipients.length,
        "NOTIFICATION_SUPPRESSED",
      ),
      pendingActions: [
        createPendingAction({
          type: "WRITE_AUDIT_EVENT",
          notificationId: request.id,
          tenantId: request.tenantId,
          at: nowIso,
          payload: { reasons: routed.reasons },
        }),
      ],
    };
  }

  let renderedTitle: string | null = null;
  let renderedMessage: string | null = null;
  try {
    const rendered = renderNotification(request, {
      strict: options.renderStrict !== false,
    });
    renderedTitle = rendered.title;
    renderedMessage = rendered.message;
    history = appendHistory(history, {
      at: nowIso,
      type: "rendered",
      message: "Template rendered",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Render failed";
    return {
      ...emptyResult(request, "failed", "RENDER_FAILED", [message]),
      history: freezeHistory(history),
    };
  }

  history = appendHistory(history, {
    at: nowIso,
    type: "queued",
    message: `Channels: ${routed.channels.join(",")}`,
  });

  const dispatched = dispatchNotification({
    request,
    channels: routed.channels,
    recipients: request.recipients,
    title: renderedTitle ?? request.event,
    message: renderedMessage ?? "",
    adapters: options.adapters,
  });

  history = appendHistory(history, {
    at: nowIso,
    type: "dispatched",
    message: `Attempts: ${dispatched.attempts.length}`,
  });

  for (const ch of dispatched.missingAdapters) {
    history = appendHistory(history, {
      at: nowIso,
      type: "failed",
      channel: ch,
      message: "Canal sem adapter",
    });
  }

  const pendingActions = [
    createPendingAction({
      type: "WRITE_AUDIT_EVENT",
      description: "Auditoria de roteamento",
      payload: {
        event: "NOTIFICATION_ROUTED",
        channels: routed.channels,
      },
      notificationId: request.id,
      tenantId: request.tenantId,
      at: nowIso,
    }),
    ...routed.channels.flatMap((channel) => {
      if (channel === "email") {
        return [
          createPendingAction({
            type: "SEND_EMAIL",
            notificationId: request.id,
            tenantId: request.tenantId,
            at: nowIso,
            payload: { title: renderedTitle },
          }),
        ];
      }
      if (channel === "push") {
        return [
          createPendingAction({
            type: "SEND_PUSH",
            notificationId: request.id,
            tenantId: request.tenantId,
            at: nowIso,
          }),
        ];
      }
      if (channel === "webhook") {
        return [
          createPendingAction({
            type: "SEND_WEBHOOK",
            notificationId: request.id,
            tenantId: request.tenantId,
            at: nowIso,
          }),
        ];
      }
      if (channel === "sms_placeholder") {
        return [
          createPendingAction({
            type: "SEND_SMS",
            notificationId: request.id,
            tenantId: request.tenantId,
            at: nowIso,
          }),
        ];
      }
      if (channel === "inbox") {
        return [
          createPendingAction({
            type: "CREATE_INBOX",
            notificationId: request.id,
            tenantId: request.tenantId,
            at: nowIso,
          }),
        ];
      }
      return [
        createPendingAction({
          type: "CREATE_IN_APP",
          notificationId: request.id,
          tenantId: request.tenantId,
          at: nowIso,
        }),
      ];
    }),
  ];

  rememberNotification(request, options.now);

  let result: NotificationResult = {
    ok: dispatched.missingAdapters.length === 0,
    status: dispatched.missingAdapters.length ? "failed" : "sent",
    reason: dispatched.missingAdapters.length ? "MISSING_ADAPTER" : "ROUTED",
    request,
    renderedTitle,
    renderedMessage,
    routedChannels: routed.channels,
    resolvedRecipients: request.recipients,
    attempts: dispatched.attempts,
    history: freezeHistory(history),
    pendingActions,
    auditIntent: createAuditIntent(
      request,
      routed.channels,
      request.recipients.length,
      "NOTIFICATION_ROUTED",
    ),
    suppressed: false,
    deduplicated: dedupe.duplicate,
    explanation: routed.reasons,
  };

  if (dedupe.action === "merge" || dedupe.action === "replace") {
    result = applyDeduplicationToResult(result, dedupe);
  }

  return result;
}

export function routeNotificationOnly(
  request: NotificationRequest,
  preference?: NotificationPreference | null,
  options?: { nowHour?: number | null },
) {
  return routeNotification(request, preference, options);
}

export function dispatchNotificationOnly(
  ...args: Parameters<typeof dispatchNotification>
) {
  return dispatchNotification(...args);
}

export function explainNotification(
  request: NotificationRequest,
  options: EvaluateOptions = {},
): NotificationResult {
  return evaluateNotification(request, options);
}

/** Pipeline completo create → evaluate. */
export function notify(
  input: CreateNotificationRequestInput,
  options: EvaluateOptions = {},
): NotificationResult {
  const request = createNotification({
    ...input,
    context: options.context ?? input.context,
    tenantId: input.tenantId ?? options.context?.tenantId,
    correlationId: input.correlationId ?? options.context?.correlationId,
    requestId: input.requestId ?? options.context?.requestId,
  });
  return evaluateNotification(request, options);
}
