import type { NotificationProvider, ProviderSendResult } from "./types.ts";
import { sanitizeProviderError, resolveEmailFromAddress } from "./runtime.ts";
import type { OutboxStatus } from "../channels.ts";
function simulated(
  status: OutboxStatus,
  message: string,
): ProviderSendResult {
  return { simulated: true, status, provider: "none", message };
}

export const DisabledEmailAdapter: NotificationProvider = {
  id: "disabled",
  channel: "email",
  async send() {
    return simulated("cancelled", "E-mail desativado.");
  },
  async getStatus(messageId) {
    return { status: "cancelled", providerMessageId: messageId };
  },
  validateConfiguration() {
    return { status: "NOT_CONFIGURED", notes: ["Modo DISABLED."] };
  },
};

export const DryRunEmailAdapter: NotificationProvider = {
  id: "dry_run",
  channel: "email",
  async send() {
    return simulated("dry_run", "E-mail transacional não enviado (DRY_RUN).");
  },
  async getStatus(messageId) {
    return { status: "dry_run", providerMessageId: messageId };
  },
  validateConfiguration() {
    return { status: "CONFIGURED", notes: ["DRY_RUN — nenhum envio real."] };
  },
};

export function emailBodyAsSafeHtml(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  return `<p>${escaped.replace(/\n/g, "<br/>")}</p>`;
}

export function createResendEmailAdapter(
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl: typeof fetch = fetch,
): NotificationProvider {
  const apiKey = env.RESEND_API_KEY ?? "";
  const from = (env.EMAIL_FROM ?? "").trim();
  const replyTo = (env.EMAIL_REPLY_TO ?? "").trim();
  return {
    id: "resend",
    channel: "email",
    async send(input): Promise<ProviderSendResult> {
      if (!input.to.includes("@")) {
        return {
          simulated: false,
          status: "failed",
          provider: "resend",
          errorCode: "missing_email",
          message: "E-mail ausente.",
        };
      }
      if (!apiKey || !resolveEmailFromAddress(from)) {
        return {
          simulated: false,
          status: "failed",
          provider: "resend",
          errorCode: "provider_not_configured",
          message: "E-mail transacional não configurado.",
        };
      }
      try {
        const res = await fetchImpl("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from,
            to: [input.to],
            subject: "Comunicado",
            html: emailBodyAsSafeHtml(input.body),
            ...(replyTo.includes("@") ? { reply_to: replyTo } : {}),
          }),
        });
        if (!res.ok) {
          return {
            simulated: false,
            status: "failed",
            provider: "resend",
            errorCode: `http_${res.status}`,
            message: sanitizeProviderError(`Falha no e-mail (${res.status}).`),
          };
        }
        const json = (await res.json()) as { id?: string };
        return {
          simulated: false,
          status: "sent",
          provider: "resend",
          providerMessageId: json.id,
          message: "E-mail aceito pelo provider.",
        };
      } catch (error) {
        return {
          simulated: false,
          status: "failed",
          provider: "resend",
          errorCode: "network",
          message: sanitizeProviderError(
            error instanceof Error ? error.message : "Falha de rede.",
          ),
        };
      }
    },
    async getStatus(messageId) {
      return { status: "unknown", providerMessageId: messageId };
    },
    validateConfiguration() {
      const notes: string[] = [];
      if (!apiKey) notes.push("RESEND_API_KEY ausente");
      if (!resolveEmailFromAddress(from)) notes.push("EMAIL_FROM ausente");
      return {
        status: notes.length ? "NOT_CONFIGURED" : "CONFIGURED",
        notes,
      };
    },
  };
}
