/**
 * Sprint 21.5 — Erros seguros.
 */

export const NOTIFICATION_ERROR_CODES = {
  INVALID_REQUEST: "NOTIF_INVALID_REQUEST",
  MISSING_TENANT: "NOTIF_MISSING_TENANT",
  INVALID_EVENT: "NOTIF_INVALID_EVENT",
  INVALID_CHANNEL: "NOTIF_INVALID_CHANNEL",
  INVALID_TEMPLATE: "NOTIF_INVALID_TEMPLATE",
  MISSING_VARIABLE: "NOTIF_MISSING_VARIABLE",
  EMPTY_RECIPIENTS: "NOTIF_EMPTY_RECIPIENTS",
  NOT_FOUND: "NOTIF_NOT_FOUND",
  GENERIC: "NOTIF_ERROR",
} as const;

export type NotificationErrorCode =
  (typeof NOTIFICATION_ERROR_CODES)[keyof typeof NOTIFICATION_ERROR_CODES];

export class NotificationError extends Error {
  readonly code: NotificationErrorCode;

  constructor(
    message: string,
    options?: { code?: NotificationErrorCode; cause?: unknown },
  ) {
    super(
      message,
      options?.cause !== undefined ? { cause: options.cause } : undefined,
    );
    this.name = "NotificationError";
    this.code = options?.code ?? NOTIFICATION_ERROR_CODES.GENERIC;
  }
}

export class InvalidNotificationRequestError extends NotificationError {
  constructor(message = "Solicitação de notificação inválida.") {
    super(message, { code: NOTIFICATION_ERROR_CODES.INVALID_REQUEST });
    this.name = "InvalidNotificationRequestError";
  }
}

export class NotificationTemplateError extends NotificationError {
  constructor(message = "Template de notificação inválido.") {
    super(message, { code: NOTIFICATION_ERROR_CODES.INVALID_TEMPLATE });
    this.name = "NotificationTemplateError";
  }
}

export function isNotificationError(
  error: unknown,
): error is NotificationError {
  return error instanceof NotificationError;
}
