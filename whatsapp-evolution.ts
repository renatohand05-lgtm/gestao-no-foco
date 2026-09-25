/**
 * Adapter Evolution API — canal de WhatsApp próprio por tenant.
 * Diferente do Meta Cloud (token global único), aqui cada tenant tem sua
 * própria instância conectada via QR code. Uso restrito a notificações
 * transacionais (OS pronta, agendamento) — nunca dispara direto: sempre
 * enfileira em `whatsapp_send_queue`, que um worker despacha em ritmo
 * controlado (ver whatsapp-queue-worker.ts).
 *
 * Segredos: EVOLUTION_API_URL / EVOLUTION_API_KEY nunca são logados.
 */
import "server-only";

import { createAdminClient } from "../../supabase/admin.ts";
import { digitsPhone } from "../channels.ts";
import { sanitizeProviderError } from "./runtime.ts";
import type { NotificationProvider, ProviderSendResult } from "./types.ts";

export function evolutionConfig(env: NodeJS.ProcessEnv = process.env): {
  baseUrl: string;
  apiKey: string;
} {
  return {
    baseUrl: (env.EVOLUTION_API_URL ?? "").replace(/\/+$/, ""),
    apiKey: env.EVOLUTION_API_KEY ?? "",
  };
}

export function evolutionConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  const cfg = evolutionConfig(env);
  return Boolean(cfg.baseUrl && cfg.apiKey);
}

/** Nome de instância determinístico e seguro (sem dados sensíveis). */
export function buildInstanceName(tenantId: string): string {
  return `tenant_${tenantId.replace(/-/g, "").slice(0, 24)}`;
}

type EvolutionChannelRow = {
  id: string;
  tenant_id: string;
  instance_name: string;
  instance_token: string | null;
  status: string;
  phone_number: string | null;
  daily_send_limit: number;
  messages_sent_today: number;
  daily_counter_date: string | null;
  first_send_at: string | null;
};

export async function getTenantWhatsAppChannel(
  tenantId: string,
): Promise<EvolutionChannelRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("tenant_whatsapp_channels")
    .select(
      "id, tenant_id, instance_name, instance_token, status, phone_number, daily_send_limit, messages_sent_today, daily_counter_date, first_send_at",
    )
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (error || !data) return null;
  return data as EvolutionChannelRow;
}

async function evolutionFetch(
  env: NodeJS.ProcessEnv,
  path: string,
  init: RequestInit,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  const cfg = evolutionConfig(env);
  return fetchImpl(`${cfg.baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      apikey: cfg.apiKey,
      ...(init.headers ?? {}),
    },
  });
}

/** Cria a instância na Evolution API e já configura o webhook de status. */
export async function createInstance(
  tenantId: string,
  webhookUrl: string,
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: true; instanceName: string; token: string | null } | { ok: false; error: string }> {
  const instanceName = buildInstanceName(tenantId);
  try {
    const res = await evolutionFetch(
      env,
      "/instance/create",
      {
        method: "POST",
        body: JSON.stringify({
          instanceName,
          qrcode: true,
          integration: "WHATSAPP-BAILEYS",
          webhook: {
            url: webhookUrl,
            events: ["CONNECTION_UPDATE", "MESSAGES_UPSERT", "SEND_MESSAGE"],
          },
        }),
      },
      fetchImpl,
    );
    if (!res.ok) {
      return { ok: false, error: sanitizeProviderError(`Falha ao criar instância (${res.status}).`) };
    }
    const json = (await res.json()) as { hash?: string | { apikey?: string } };
    const token =
      typeof json.hash === "string" ? json.hash : (json.hash?.apikey ?? null);
    return { ok: true, instanceName, token };
  } catch (error) {
    return {
      ok: false,
      error: sanitizeProviderError(error instanceof Error ? error.message : "Falha de rede."),
    };
  }
}

export async function fetchQrCode(
  instanceName: string,
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: true; base64: string | null } | { ok: false; error: string }> {
  try {
    const res = await evolutionFetch(
      env,
      `/instance/connect/${encodeURIComponent(instanceName)}`,
      { method: "GET" },
      fetchImpl,
    );
    if (!res.ok) {
      return { ok: false, error: sanitizeProviderError(`Falha ao gerar QR (${res.status}).`) };
    }
    const json = (await res.json()) as { base64?: string; qrcode?: { base64?: string } };
    return { ok: true, base64: json.base64 ?? json.qrcode?.base64 ?? null };
  } catch (error) {
    return {
      ok: false,
      error: sanitizeProviderError(error instanceof Error ? error.message : "Falha de rede."),
    };
  }
}

export async function fetchConnectionState(
  instanceName: string,
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl: typeof fetch = fetch,
): Promise<"connected" | "disconnected" | "connecting" | "error"> {
  try {
    const res = await evolutionFetch(
      env,
      `/instance/connectionState/${encodeURIComponent(instanceName)}`,
      { method: "GET" },
      fetchImpl,
    );
    if (!res.ok) return "error";
    const json = (await res.json()) as { instance?: { state?: string } };
    const state = json.instance?.state;
    if (state === "open") return "connected";
    if (state === "connecting") return "connecting";
    return "disconnected";
  } catch {
    return "error";
  }
}

/** Envio direto (chamado só pelo worker da fila, nunca pelo caminho síncrono do request). */
export async function sendEvolutionMessage(
  instanceName: string,
  to: string,
  body: string,
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl: typeof fetch = fetch,
): Promise<ProviderSendResult> {
  const digits = digitsPhone(to);
  if (!digits) {
    return {
      simulated: false,
      status: "failed",
      provider: "evolution",
      errorCode: "missing_phone",
      message: "Telefone ausente.",
    };
  }
  if (!evolutionConfigured(env)) {
    return {
      simulated: false,
      status: "failed",
      provider: "evolution",
      errorCode: "provider_not_configured",
      message: "Evolution API não configurada.",
    };
  }
  try {
    const res = await evolutionFetch(
      env,
      `/message/sendText/${encodeURIComponent(instanceName)}`,
      {
        method: "POST",
        body: JSON.stringify({ number: digits, text: body }),
      },
      fetchImpl,
    );
    if (!res.ok) {
      return {
        simulated: false,
        status: "failed",
        provider: "evolution",
        errorCode: `http_${res.status}`,
        message: sanitizeProviderError(`Falha no provider (${res.status}).`),
      };
    }
    const json = (await res.json()) as { key?: { id?: string } };
    return {
      simulated: false,
      status: "sent",
      provider: "evolution",
      providerMessageId: json.key?.id,
      message: "Mensagem aceita pelo provider.",
    };
  } catch (error) {
    return {
      simulated: false,
      status: "failed",
      provider: "evolution",
      errorCode: "network",
      message: sanitizeProviderError(error instanceof Error ? error.message : "Falha de rede."),
    };
  }
}

/**
 * Adapter usado pelo dispatch síncrono: NUNCA chama a Evolution API
 * diretamente. Só enfileira — o worker (whatsapp-queue-worker.ts) processa
 * com throttling, warm-up e respeito ao horário comercial.
 */
export function createEvolutionWhatsAppAdapter(
  channel: EvolutionChannelRow,
): NotificationProvider {
  return {
    id: "evolution",
    channel: "whatsapp",
    async send(input): Promise<ProviderSendResult> {
      const to = digitsPhone(input.to);
      if (!to) {
        return {
          simulated: false,
          status: "failed",
          provider: "evolution",
          errorCode: "missing_phone",
          message: "Telefone ausente.",
        };
      }
      if (channel.status !== "connected") {
        return {
          simulated: false,
          status: "failed",
          provider: "evolution",
          errorCode: "channel_not_connected",
          message: "Canal WhatsApp do tenant não está conectado.",
        };
      }
      const admin = createAdminClient();
      const { error } = await admin.from("whatsapp_send_queue").insert({
        tenant_id: input.tenantId,
        channel_id: channel.id,
        to_address: to,
        body: input.body,
      });
      if (error) {
        return {
          simulated: false,
          status: "failed",
          provider: "evolution",
          errorCode: "queue_insert_failed",
          message: sanitizeProviderError(error.message),
        };
      }
      return {
        simulated: false,
        status: "queued",
        provider: "evolution",
        message: "Enfileirado para envio throttled.",
      };
    },
    async getStatus(messageId) {
      return { status: "unknown", providerMessageId: messageId };
    },
    validateConfiguration() {
      const notes: string[] = [];
      if (channel.status !== "connected") notes.push(`Canal com status '${channel.status}'`);
      if (!evolutionConfigured()) notes.push("EVOLUTION_API_URL/EVOLUTION_API_KEY ausentes");
      return {
        status: notes.length ? "NOT_CONFIGURED" : "CONFIGURED",
        notes: notes.length ? notes : [`Instância ${channel.instance_name} conectada.`],
      };
    },
  };
}
