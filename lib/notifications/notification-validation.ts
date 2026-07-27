/**
 * Sprint 21.5 — Validação de requests.
 */

import { isKnownChannel } from "./channels.ts";
import { isKnownCategory } from "./categories.ts";
import { isKnownNotificationEvent } from "./events.ts";
import { isKnownPriority } from "./priorities.ts";
import { isValidRecipient } from "./notification-recipient.ts";
import type {
  NotificationRequest,
  NotificationValidationIssue,
  NotificationValidationResult,
} from "./types.ts";

function issue(
  code: string,
  message: string,
  path?: string,
): NotificationValidationIssue {
  return { code, message, path };
}

export function validateNotificationRequest(
  request: NotificationRequest | null | undefined,
): NotificationValidationResult {
  const issues: NotificationValidationIssue[] = [];
  if (!request || typeof request !== "object") {
    return {
      valid: false,
      issues: [issue("INVALID_REQUEST", "Request ausente.")],
    };
  }

  if (!request.tenantId?.trim()) {
    issues.push(issue("MISSING_TENANT", "tenantId obrigatório.", "tenantId"));
  }
  if (!isKnownNotificationEvent(request.event)) {
    issues.push(issue("INVALID_EVENT", `Evento inválido: ${request.event}`, "event"));
  }
  if (!isKnownCategory(request.category)) {
    issues.push(
      issue("INVALID_CATEGORY", `Categoria inválida: ${request.category}`, "category"),
    );
  }
  if (!isKnownPriority(request.priority)) {
    issues.push(
      issue("INVALID_PRIORITY", `Prioridade inválida: ${request.priority}`, "priority"),
    );
  }
  if (!request.channels?.length) {
    issues.push(issue("NO_CHANNELS", "Nenhum canal informado.", "channels"));
  } else {
    for (const ch of request.channels) {
      if (!isKnownChannel(ch)) {
        issues.push(issue("INVALID_CHANNEL", `Canal inválido: ${ch}`, "channels"));
      }
    }
  }
  if (!request.recipients?.length) {
    issues.push(
      issue("EMPTY_RECIPIENTS", "Destinatário vazio.", "recipients"),
    );
  } else {
    for (const r of request.recipients) {
      if (!isValidRecipient(r)) {
        issues.push(
          issue("INVALID_RECIPIENT", `Destinatário inválido: ${r.id}`, "recipients"),
        );
      }
    }
  }

  if (request.expiresAt) {
    const exp = new Date(request.expiresAt).getTime();
    if (Number.isNaN(exp)) {
      issues.push(issue("INVALID_EXPIRES", "expiresAt inválido.", "expiresAt"));
    } else if (exp < new Date(request.createdAt).getTime()) {
      issues.push(
        issue("EXPIRES_BEFORE_CREATED", "expiresAt anterior à criação.", "expiresAt"),
      );
    }
  }

  if (request.scheduledAt) {
    const sch = new Date(request.scheduledAt).getTime();
    if (Number.isNaN(sch)) {
      issues.push(
        issue("INVALID_SCHEDULED", "scheduledAt inválido.", "scheduledAt"),
      );
    }
  }

  return { valid: issues.length === 0, issues };
}
