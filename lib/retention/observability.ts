import { logger } from "@/lib/observability/logger";
import { scrubSecrets } from "./mask.ts";

export { maskAddress } from "./mask.ts";

export function correlationId(prefix = "n"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export type CommunicationDispatchLog = {
  event?: string;
  tenantId?: string;
  correlationId?: string;
  channel?: string;
  mode?: string;
  allowlisted?: boolean;
  provider?: string;
  dispatch?: "started" | "sent" | "failed" | "blocked" | "skipped";
  providerMessageId?: string;
  failureKind?: string;
  note?: string;
};

/** Logs estruturados sem secrets nem e-mail completo. */
export function logCommunicationDispatch(input: CommunicationDispatchLog): void {
  const parts = [
    input.event ? `event=${input.event}` : null,
    input.channel ? `channel=${input.channel}` : null,
    input.mode ? `mode=${input.mode}` : null,
    input.allowlisted != null ? `allowlisted=${input.allowlisted}` : null,
    input.provider ? `provider=${input.provider}` : null,
    input.dispatch ? `dispatch=${input.dispatch}` : null,
    input.providerMessageId ? `provider_message_id=${input.providerMessageId}` : null,
    input.failureKind ? `failure_kind=${input.failureKind}` : null,
    input.note ? scrubSecrets(input.note) : null,
  ].filter(Boolean);
  logger.info(`communication ${parts.join(" ")}`, {
    tenantId: input.tenantId,
    correlationId: input.correlationId,
    channel: input.channel,
    status: input.dispatch,
  });
}

export function logCommunication(input: {
  event:
    | "queued"
    | "provider_request"
    | "provider_accepted"
    | "webhook_received"
    | "delivered"
    | "read"
    | "failed"
    | "retry";
  tenantId?: string;
  correlationId?: string;
  channel?: string;
  status?: string;
  note?: string;
}): void {
  logger.info(`comm.${input.event}`, {
    tenantId: input.tenantId,
    correlationId: input.correlationId,
    channel: input.channel,
    status: input.status,
    note: input.note ? scrubSecrets(input.note) : undefined,
  });
}
