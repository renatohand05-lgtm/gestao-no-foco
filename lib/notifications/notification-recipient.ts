/**
 * Sprint 21.5 — Destinatários.
 */

import type {
  NotificationRecipient,
  NotificationRecipientKind,
} from "./types.ts";

export function createRecipient(input: {
  kind: NotificationRecipientKind;
  userId?: string | null;
  role?: string | null;
  permission?: string | null;
  teamId?: string | null;
  email?: string | null;
  deviceId?: string | null;
  resolverKey?: string | null;
  metadata?: Record<string, unknown>;
}): NotificationRecipient {
  const idParts = [
    input.kind,
    input.userId,
    input.role,
    input.permission,
    input.teamId,
    input.email,
    input.deviceId,
    input.resolverKey,
  ]
    .filter(Boolean)
    .map((v) => String(v).trim());

  return {
    id: idParts.join(":") || `${input.kind}:unknown`,
    kind: input.kind,
    userId: input.userId?.trim() || null,
    role: input.role?.trim() || null,
    permission: input.permission?.trim() || null,
    teamId: input.teamId?.trim() || null,
    email: input.email?.trim() || null,
    deviceId: input.deviceId?.trim() || null,
    resolverKey: input.resolverKey?.trim() || null,
    metadata: input.metadata ?? {},
  };
}

export function normalizeRecipients(
  recipients: readonly NotificationRecipient[] | null | undefined,
): NotificationRecipient[] {
  if (!recipients || recipients.length === 0) return [];
  const seen = new Set<string>();
  const out: NotificationRecipient[] = [];
  for (const r of recipients) {
    if (!r || typeof r !== "object" || !r.kind) continue;
    const normalized = createRecipient(r);
    if (seen.has(normalized.id)) continue;
    seen.add(normalized.id);
    out.push(normalized);
  }
  return out;
}

export function isValidRecipient(recipient: NotificationRecipient): boolean {
  if (!recipient?.kind) return false;
  switch (recipient.kind) {
    case "user":
      return !!recipient.userId;
    case "role":
      return !!recipient.role;
    case "permission":
      return !!recipient.permission;
    case "team":
      return !!recipient.teamId;
    case "tenant":
      return true;
    case "email":
      return !!recipient.email;
    case "device":
      return !!recipient.deviceId;
    case "dynamic":
      return !!recipient.resolverKey;
    default:
      return false;
  }
}
