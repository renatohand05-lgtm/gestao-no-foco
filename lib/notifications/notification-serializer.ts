/**
 * Sprint 21.5 — Serialização JSON (sem gravar arquivos).
 */

import { createNotificationRequest } from "./notification-request.ts";
import { validateNotificationRequest } from "./notification-validation.ts";
import type { NotificationRequest, NotificationResult } from "./types.ts";

export function serializeNotificationRequest(
  request: NotificationRequest,
): string {
  return JSON.stringify(request);
}

export function deserializeNotificationRequest(
  json: string,
): NotificationRequest {
  const raw = JSON.parse(json) as NotificationRequest;
  const request = createNotificationRequest({
    ...raw,
    strict: false,
  });
  const validation = validateNotificationRequest(request);
  if (!validation.valid) {
    throw new Error(validation.issues[0]?.message ?? "Request inválida.");
  }
  return request;
}

export function serializeNotificationResult(result: NotificationResult): string {
  return JSON.stringify(result);
}

export function deserializeNotificationResult(
  json: string,
): NotificationResult {
  return JSON.parse(json) as NotificationResult;
}
