import type { NotificationProvider, ProviderSendResult } from "./types.ts";
import { buildWaMeLink, digitsPhone, type OutboxStatus } from "../channels.ts";
import type { ProviderHealthStatus } from "./runtime.ts";

function simulated(
  provider: string,
  status: OutboxStatus,
  message: string,
): ProviderSendResult {
  return { simulated: true, status, provider, message };
}

export const DisabledWhatsAppAdapter: NotificationProvider = {
  id: "disabled",
  channel: "whatsapp",
  async send() {
    return simulated("none", "cancelled", "WhatsApp real desativado.");
  },
  async getStatus(messageId) {
    return { status: "cancelled", providerMessageId: messageId };
  },
  validateConfiguration() {
    return { status: "NOT_CONFIGURED", notes: ["Modo DISABLED."] };
  },
};

export const DryRunWhatsAppAdapter: NotificationProvider = {
  id: "dry_run",
  channel: "whatsapp",
  async send() {
    return simulated("none", "dry_run", "WhatsApp não enviado (DRY_RUN).");
  },
  async getStatus(messageId) {
    return { status: "dry_run", providerMessageId: messageId };
  },
  validateConfiguration() {
    return { status: "CONFIGURED", notes: ["DRY_RUN — nenhum envio real."] };
  },
};

export const ManualLinkWhatsAppAdapter: NotificationProvider = {
  id: "manual_link",
  channel: "whatsapp",
  async send(input) {
    if (!digitsPhone(input.to)) {
      return simulated("wa.me", "failed", "Telefone ausente.");
    }
    return {
      simulated: true,
      status: "manual_opened",
      provider: "wa.me",
      message: buildWaMeLink(input.to, input.body),
    };
  },
  async getStatus(messageId) {
    return { status: "manual_opened", providerMessageId: messageId };
  },
  validateConfiguration() {
    return { status: "CONFIGURED", notes: ["Link wa.me. Não é DELIVERED."] };
  },
};

export function healthNotes(status: ProviderHealthStatus): string[] {
  return [status];
}
