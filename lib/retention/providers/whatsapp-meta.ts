/**
 * Adapter Meta WhatsApp Cloud API.
 * Só envia se o factory já passou no kill switch.
 * Token nunca é logado / retornado.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

import type {
  NotificationProvider,
  ProviderSendResult,
  WebhookHandleResult,
} from "./types.ts";
import { digitsPhone } from "../channels.ts";
import { sanitizeProviderError } from "./runtime.ts";

const GRAPH_VERSION = "v21.0";

export function metaCloudConfig(env: NodeJS.ProcessEnv = process.env): {
  token: string;
  phoneNumberId: string;
  appSecret: string;
  verifyToken: string;
} {
  return {
    token: env.WHATSAPP_ACCESS_TOKEN ?? "",
    phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID ?? "",
    appSecret: env.WHATSAPP_APP_SECRET ?? "",
    verifyToken: env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ?? "",
  };
}

export function metaMessagesUrl(phoneNumberId: string): string {
  return `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`;
}

export function verifyMetaSignature(
  rawBody: string,
  header: string | null | undefined,
  appSecret: string,
): boolean {
  if (!header || !appSecret) return false;
  const expected = "sha256=" + createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function parseMetaWebhook(rawBody: string): WebhookHandleResult {
  try {
    const payload = JSON.parse(rawBody) as {
      entry?: Array<{
        id?: string;
        changes?: Array<{
          value?: {
            statuses?: Array<{
              id?: string;
              status?: string;
            }>;
            messages?: Array<{
              id?: string;
              from?: string;
              text?: { body?: string };
            }>;
          };
        }>;
      }>;
    };
    const change = payload.entry?.[0]?.changes?.[0]?.value;
    const status = change?.statuses?.[0];
    if (status?.id) {
      const mapped =
        status.status === "read"
          ? "read"
          : status.status === "delivered"
            ? "delivered"
            : status.status === "failed"
              ? "failed"
              : "sent";
      return {
        duplicated: false,
        eventId: `${status.id}:${status.status ?? "status"}`,
        kind: "status",
        providerMessageId: status.id,
        mappedStatus: mapped,
      };
    }
    const inbound = change?.messages?.[0];
    if (inbound?.id) {
      return {
        duplicated: false,
        eventId: inbound.id,
        kind: "inbound",
        providerMessageId: inbound.id,
        inboundText: inbound.text?.body ?? "",
        fromAddress: inbound.from ?? "",
      };
    }
    return {
      duplicated: false,
      eventId: payload.entry?.[0]?.id ?? "ignored",
      kind: "ignored",
    };
  } catch {
    return { duplicated: false, eventId: "invalid", kind: "ignored" };
  }
}

export function createMetaCloudWhatsAppAdapter(
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl: typeof fetch = fetch,
): NotificationProvider {
  const cfg = metaCloudConfig(env);
  return {
    id: "meta_cloud",
    channel: "whatsapp",
    async send(input): Promise<ProviderSendResult> {
      const to = digitsPhone(input.to);
      if (!to) {
        return {
          simulated: false,
          status: "failed",
          provider: "meta_cloud",
          errorCode: "missing_phone",
          message: "Telefone ausente.",
        };
      }
      if (!cfg.token || !cfg.phoneNumberId) {
        return {
          simulated: false,
          status: "failed",
          provider: "meta_cloud",
          errorCode: "not_configured",
          message: "WhatsApp Cloud não configurado.",
        };
      }
      try {
        const res = await fetchImpl(metaMessagesUrl(cfg.phoneNumberId), {
          method: "POST",
          headers: {
            Authorization: `Bearer ${cfg.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to,
            type: "text",
            text: { body: input.body },
          }),
        });
        if (!res.ok) {
          return {
            simulated: false,
            status: "failed",
            provider: "meta_cloud",
            errorCode: `http_${res.status}`,
            message: sanitizeProviderError(`Falha no provider (${res.status}).`),
          };
        }
        const json = (await res.json()) as { messages?: Array<{ id?: string }> };
        return {
          simulated: false,
          status: "sent",
          provider: "meta_cloud",
          providerMessageId: json.messages?.[0]?.id,
          message: "Mensagem aceita pelo provider.",
        };
      } catch (error) {
        return {
          simulated: false,
          status: "failed",
          provider: "meta_cloud",
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
    async handleWebhook(rawBody, headers) {
      const ok = verifyMetaSignature(
        rawBody,
        headers["x-hub-signature-256"] ?? headers["X-Hub-Signature-256"],
        cfg.appSecret,
      );
      if (!ok) {
        return { duplicated: false, eventId: "invalid-signature", kind: "ignored" };
      }
      return parseMetaWebhook(rawBody);
    },
    validateConfiguration() {
      const notes: string[] = [];
      if (!cfg.token) notes.push("WHATSAPP_ACCESS_TOKEN ausente");
      if (!cfg.phoneNumberId) notes.push("WHATSAPP_PHONE_NUMBER_ID ausente");
      if (!cfg.verifyToken) notes.push("WHATSAPP_WEBHOOK_VERIFY_TOKEN ausente");
      if (!cfg.appSecret) notes.push("WHATSAPP_APP_SECRET ausente");
      return {
        status: notes.length ? "NOT_CONFIGURED" : "CONFIGURED",
        notes: notes.length ? notes : ["Credenciais presentes. Nenhuma chamada de validação realizada."],
      };
    },
  };
}
