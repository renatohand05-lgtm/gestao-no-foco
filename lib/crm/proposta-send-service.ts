import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { sendReciboViaEmail, sendReciboViaWhatsapp } from "@/lib/vendas/venda-recibo-send-service";
import { createAdminClient, isAdminClientAvailable } from "@/lib/supabase/admin";

export const CRM_PROPOSTA_BUCKET = "crm-propostas";

export async function uploadPropostaPdf(
  supabase: SupabaseClient,
  tenantId: string,
  propostaId: string,
  pdfBuffer: Buffer,
): Promise<{ storagePath: string }> {
  const storagePath = `${tenantId}/propostas/${propostaId}/proposta-${Date.now()}.pdf`;

  const { error } = await supabase.storage
    .from(CRM_PROPOSTA_BUCKET)
    .upload(storagePath, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (error) {
    throw new Error(`Falha no upload da proposta: ${error.message}`);
  }

  return { storagePath };
}

export async function createPropostaSignedUrl(
  supabase: SupabaseClient,
  storagePath: string,
  expiresIn = 3600,
): Promise<string> {
  const client = isAdminClientAvailable() ? createAdminClient() : supabase;

  const { data, error } = await client.storage
    .from(CRM_PROPOSTA_BUCKET)
    .createSignedUrl(storagePath, expiresIn);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? "Não foi possível gerar o link da proposta.");
  }

  return data.signedUrl;
}

// Reaproveita exatamente os mesmos disparadores do recibo de venda — só
// muda o que é enviado (link/PDF da proposta em vez do recibo).
export { sendReciboViaEmail as sendPropostaViaEmail };
export { sendReciboViaWhatsapp as sendPropostaViaWhatsapp };
