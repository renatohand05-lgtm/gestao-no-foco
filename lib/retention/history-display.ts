import { originLabel } from "./origin.ts";
import { operatorStatusLabel } from "./pipeline.ts";

export function communicationHistoryMark(
  status: string,
  errorCode?: string | null,
): "✓" | "!" | "○" {
  if (status === "failed") return "!";
  if (
    status === "blocked" ||
    errorCode === "blocked_by_allowlist" ||
    errorCode === "not_allowlisted"
  ) {
    return "○";
  }
  if (["sent", "delivered", "read", "manual_opened"].includes(status)) return "✓";
  return "○";
}

export function communicationHistoryLine(input: {
  status: string;
  channel: string;
  origin_kind?: string | null;
  template_code?: string | null;
  error_code?: string | null;
}): string {
  const mark = communicationHistoryMark(input.status, input.error_code);
  const channel = input.channel === "email" ? "E-mail" : "WhatsApp";
  const event = originLabel(input.origin_kind, input.template_code);
  const status = operatorStatusLabel(input.status, input.error_code);
  return `${mark} ${channel} — ${event} — ${status}`;
}
