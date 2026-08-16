import { logger } from "@/lib/observability/logger";
import { scrubSecrets } from "./mask.ts";

export { maskAddress } from "./mask.ts";

export function correlationId(prefix = "n"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
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
