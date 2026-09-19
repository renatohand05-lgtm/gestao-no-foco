import "server-only";

import { metaCloudConfig } from "@/lib/retention/providers/whatsapp-meta";

const GRAPH_VERSION = "v21.0";

export type WhatsAppPhoneStatus = {
  ok: boolean;
  error?: string;
  displayPhoneNumber?: string;
  verifiedName?: string;
  codeVerificationStatus?: string;
  qualityRating?: string;
  platformType?: string;
  throughputLevel?: string;
};

/**
 * Consulta só-leitura do número configurado — mostra se ele já está
 * verificado e qual a qualidade dele, sem alterar nada.
 */
export async function checkWhatsAppPhoneStatus(): Promise<WhatsAppPhoneStatus> {
  const cfg = metaCloudConfig();
  if (!cfg.token || !cfg.phoneNumberId) {
    return { ok: false, error: "WHATSAPP_ACCESS_TOKEN ou WHATSAPP_PHONE_NUMBER_ID ausente." };
  }

  const url =
    `https://graph.facebook.com/${GRAPH_VERSION}/${cfg.phoneNumberId}` +
    "?fields=display_phone_number,verified_name,code_verification_status,quality_rating,platform_type,throughput";

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${cfg.token}` },
      cache: "no-store",
    });
    const json = (await res.json()) as Record<string, unknown>;

    if (!res.ok) {
      const message =
        (json.error as { message?: string } | undefined)?.message ??
        `Erro HTTP ${res.status}`;
      return { ok: false, error: message };
    }

    return {
      ok: true,
      displayPhoneNumber: json.display_phone_number as string | undefined,
      verifiedName: json.verified_name as string | undefined,
      codeVerificationStatus: json.code_verification_status as string | undefined,
      qualityRating: json.quality_rating as string | undefined,
      platformType: json.platform_type as string | undefined,
      throughputLevel:
        (json.throughput as { level?: string } | undefined)?.level ?? undefined,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Falha de rede.",
    };
  }
}

export type WhatsAppRegisterResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Registra o número pra uso via Cloud API (PIN de verificação em 2 etapas).
 * Só precisa rodar uma vez — ou de novo se o número for desregistrado.
 */
export async function registerWhatsAppNumber(
  pin: string,
): Promise<WhatsAppRegisterResult> {
  const cfg = metaCloudConfig();
  if (!cfg.token || !cfg.phoneNumberId) {
    return { ok: false, error: "WHATSAPP_ACCESS_TOKEN ou WHATSAPP_PHONE_NUMBER_ID ausente." };
  }
  if (!/^\d{6}$/.test(pin)) {
    return { ok: false, error: "O PIN precisa ter exatamente 6 dígitos." };
  }

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${cfg.phoneNumberId}/register`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messaging_product: "whatsapp", pin }),
    });
    const json = (await res.json()) as Record<string, unknown>;

    if (!res.ok || json.success !== true) {
      const message =
        (json.error as { message?: string } | undefined)?.message ??
        "A Meta recusou o registro.";
      return { ok: false, error: message };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Falha de rede.",
    };
  }
}

export type WhatsAppTestSendResult =
  | { ok: true; providerMessageId?: string }
  | { ok: false; error: string };

/** Envia uma mensagem de texto simples pra confirmar o fluxo de ponta a ponta. */
export async function sendWhatsAppTestMessage(
  toPhoneDigits: string,
): Promise<WhatsAppTestSendResult> {
  const cfg = metaCloudConfig();
  if (!cfg.token || !cfg.phoneNumberId) {
    return { ok: false, error: "WHATSAPP_ACCESS_TOKEN ou WHATSAPP_PHONE_NUMBER_ID ausente." };
  }

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${cfg.phoneNumberId}/messages`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: toPhoneDigits,
        type: "text",
        text: {
          body: "Teste de integração — Gestão no Foco. Se você recebeu isso, o WhatsApp Business está funcionando de ponta a ponta.",
        },
      }),
    });
    const json = (await res.json()) as {
      messages?: Array<{ id?: string }>;
      error?: { message?: string };
    };

    if (!res.ok) {
      return { ok: false, error: json.error?.message ?? `Erro HTTP ${res.status}` };
    }
    return { ok: true, providerMessageId: json.messages?.[0]?.id };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Falha de rede.",
    };
  }
}
