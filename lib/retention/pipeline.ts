/**
 * Sprint 35.2.3 — Pipeline profissional de comunicação.
 * Status internos 35.2 (dry_run/manual_opened) permanecem.
 * Não inventa delivered/read.
 */

export const PIPELINE_STATUSES = [
  "draft",
  "scheduled",
  "queued",
  "processing",
  "sent",
  "delivered",
  "read",
  "failed",
  "cancelled",
  "suppressed",
  "blocked",
] as const;
export type PipelineStatus = (typeof PIPELINE_STATUSES)[number];

export const OPERATOR_STATUS_LABELS: Record<string, string> = {
  draft: "Aguardando",
  scheduled: "Aguardando",
  queued: "Aguardando",
  pending: "Aguardando",
  ready: "Aguardando",
  processing: "Aguardando",
  dry_run: "Aguardando",
  manual_opened: "Enviado",
  sent: "Enviado",
  delivered: "Entregue",
  read: "Entregue",
  failed: "Falhou",
  cancelled: "Cancelada",
  suppressed: "Cancelada",
  blocked: "Bloqueado pelo modo de teste",
};

const RANK: Record<string, number> = {
  draft: 0,
  scheduled: 1,
  queued: 2,
  pending: 2,
  ready: 3,
  processing: 4,
  dry_run: 4,
  manual_opened: 5,
  sent: 5,
  delivered: 6,
  read: 7,
  failed: 90,
  cancelled: 91,
  suppressed: 92,
  blocked: 93,
};

export function operatorStatusLabel(
  status: string,
  errorCode?: string | null,
): string {
  if (
    status === "blocked" ||
    errorCode === "blocked_by_allowlist" ||
    errorCode === "not_allowlisted"
  ) {
    return "Bloqueado pelo modo de teste";
  }
  return OPERATOR_STATUS_LABELS[status] ?? "Aguardando";
}

export function toPipelineStatus(input: {
  status: string;
  optedIn?: boolean;
  mode?: string;
}): PipelineStatus {
  if (input.optedIn === false) return "suppressed";
  if (input.status === "cancelled" && input.mode === "disabled") return "suppressed";
  if (input.status === "ready" || input.status === "pending") return "queued";
  if ((PIPELINE_STATUSES as readonly string[]).includes(input.status)) {
    return input.status as PipelineStatus;
  }
  if (input.status === "dry_run") return "queued";
  if (input.status === "manual_opened") return "sent";
  return "queued";
}

/** DELIVERED/READ só avançam. Nunca recua sent←delivered. */
export function canAdvanceStatus(current: string, next: string): boolean {
  if (current === next) return false;
  if (current === "cancelled" || current === "suppressed" || current === "blocked") {
    return false;
  }
  const a = RANK[current];
  const b = RANK[next];
  if (a == null || b == null) return false;
  if (next === "failed") {
    return a < RANK.delivered;
  }
  if (current === "failed") return next === "queued" || next === "processing";
  return b > a;
}

export function kpiBucket(
  status: string,
): "awaiting" | "sent" | "delivered" | "read" | "failed" | "cancelled" {
  if (status === "sent" || status === "manual_opened") return "sent";
  if (status === "delivered") return "delivered";
  if (status === "read") return "read";
  if (status === "failed") return "failed";
  if (status === "cancelled" || status === "suppressed" || status === "blocked") {
    return "cancelled";
  }
  return "awaiting";
}

export function persistOutboxStatus(input: {
  decisionStatus: string;
  optedIn: boolean;
  mode?: string;
  note?: string;
}): string {
  if (!input.optedIn) return "suppressed";
  if (input.mode === "disabled") return "suppressed";
  if (input.decisionStatus === "cancelled" && input.mode === "disabled") {
    return "suppressed";
  }
  const note = (input.note ?? "").toLowerCase();
  if (
    (input.decisionStatus === "failed" || input.decisionStatus === "cancelled") &&
    /ausente|sem canal|inexistente/.test(note)
  ) {
    return "suppressed";
  }
  return input.decisionStatus;
}

export function isConfirmedDelivery(status: string): boolean {
  return status === "delivered" || status === "read";
}
