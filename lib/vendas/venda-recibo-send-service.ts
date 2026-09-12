import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { digitsPhone } from "@/lib/retention/channels";
import {
  metaCloudConfig,
  metaMessagesUrl,
} from "@/lib/retention/providers/whatsapp-meta";
import {
  resolveEmailFromAddress,
  sanitizeProviderError,
} from "@/lib/retention/providers/runtime";
import { createAdminClient, isAdminClientAvailable } from "@/lib/supabase/admin";

export const VENDA_RECIBO_BUCKET = "vendas-recibos";

export type SendResult =
  | { ok: true; providerMessageId?: string }
  | { ok: false; error: string };

/** Sobe o PDF do recibo pro storage privado do tenant. */
export async function uploadReciboPdf(
  supabase: SupabaseClient,
  tenantId: string,
  vendaId: string,
  pdfBuffer: Buffer,
): Promise<{ storagePath: string }> {
  const storagePath = `${tenantId}/vendas/${vendaId}/recibo-${Date.now()}.pdf`;

  const { error } = await supabase.storage
    .from(VENDA_RECIBO_BUCKET)
    .upload(storagePath, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (error) {
    throw new Error(`Falha no upload do recibo: ${error.message}`);
  }

  return { storagePath };
}

/** Gera uma URL assinada temporária pro recibo (nunca fica pública direto). */
export async function createReciboSignedUrl(
  supabase: SupabaseClient,
  storagePath: string,
  expiresIn = 3600,
): Promise<string> {
  const client = isAdminClientAvailable() ? createAdminClient() : supabase;

  const { data, error } = await client.storage
    .from(VENDA_RECIBO_BUCKET)
    .createSignedUrl(storagePath, expiresIn);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? "Não foi possível gerar o link do recibo.");
  }

  return data.signedUrl;
}

/**
 * Envia o recibo como documento pelo WhatsApp (Meta Cloud API), via link
 * assinado — não precisa fazer upload prévio pra Meta.
 *
 * Atenção: como qualquer mensagem do WhatsApp Business, se a conversa
 * estiver fora da janela de 24h, a Meta pode exigir um template
 * pré-aprovado em vez de mensagem livre — mesma regra que já vale hoje
 * pras mensagens de texto deste sistema.
 */
export async function sendReciboViaWhatsapp(
  telefone: string,
  signedUrl: string,
  filename: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<SendResult> {
  const cfg = metaCloudConfig(env);
  const to = digitsPhone(telefone);

  if (!to) return { ok: false, error: "Telefone inválido." };
  if (!cfg.token || !cfg.phoneNumberId) {
    return { ok: false, error: "WhatsApp Cloud não configurado." };
  }

  try {
    const res = await fetch(metaMessagesUrl(cfg.phoneNumberId), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "document",
        document: { link: signedUrl, filename },
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        ok: false,
        error: sanitizeProviderError(
          `Falha no WhatsApp (${res.status}): ${text.slice(0, 200)}`,
        ),
      };
    }

    const json = (await res.json()) as { messages?: Array<{ id?: string }> };
    return { ok: true, providerMessageId: json.messages?.[0]?.id };
  } catch (error) {
    return {
      ok: false,
      error: sanitizeProviderError(
        error instanceof Error ? error.message : "Falha de rede.",
      ),
    };
  }
}

/** Envia o recibo em anexo por e-mail (Resend). */
export async function sendReciboViaEmail(
  destinatario: string,
  pdfBuffer: Buffer,
  filename: string,
  subject: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<SendResult> {
  const apiKey = env.RESEND_API_KEY ?? "";
  const from = (env.EMAIL_FROM ?? "").trim();

  if (!destinatario.includes("@")) {
    return { ok: false, error: "E-mail inválido." };
  }
  if (!apiKey || !resolveEmailFromAddress(from)) {
    return { ok: false, error: "E-mail transacional não configurado." };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [destinatario],
        subject,
        html: "<p>Segue em anexo o comprovante da sua compra.</p>",
        attachments: [
          { filename, content: pdfBuffer.toString("base64") },
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        ok: false,
        error: sanitizeProviderError(
          `Falha no e-mail (${res.status}): ${text.slice(0, 200)}`,
        ),
      };
    }

    const json = (await res.json()) as { id?: string };
    return { ok: true, providerMessageId: json.id };
  } catch (error) {
    return {
      ok: false,
      error: sanitizeProviderError(
        error instanceof Error ? error.message : "Falha de rede.",
      ),
    };
  }
}
