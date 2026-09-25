"use server";

/**
 * Server actions do canal de WhatsApp próprio por tenant (Evolution API).
 * Só admin/owner do tenant pode conectar/desconectar (mesma trava da RLS).
 * instance_token nunca é retornado ao client.
 */
import { createAdminClient } from "../supabase/admin";
import { requireTenant } from "../tenants";
import {
  buildInstanceName,
  createInstance,
  fetchConnectionState,
  fetchQrCode,
} from "./providers/whatsapp-evolution";

export type WhatsAppChannelStatus = {
  status: "none" | "pending" | "qr_pending" | "connected" | "disconnected" | "banned" | "error";
  phoneNumber: string | null;
  lastError: string | null;
};

function requireAdminRole(role: string) {
  if (role !== "owner" && role !== "admin") {
    throw new Error("Apenas owner/admin pode gerenciar o canal de WhatsApp.");
  }
}

export async function getWhatsAppChannelStatusAction(
  tenantSlug: string,
): Promise<WhatsAppChannelStatus> {
  const tenant = await requireTenant(tenantSlug);
  const admin = createAdminClient();
  const { data } = await admin
    .from("tenant_whatsapp_channels")
    .select("status, phone_number, last_error")
    .eq("tenant_id", tenant.id)
    .maybeSingle();
  if (!data) return { status: "none", phoneNumber: null, lastError: null };
  return {
    status: data.status as WhatsAppChannelStatus["status"],
    phoneNumber: data.phone_number,
    lastError: data.last_error,
  };
}

export async function connectWhatsAppChannelAction(
  tenantSlug: string,
): Promise<{ success: true; qrBase64: string | null } | { success: false; error: string }> {
  const tenant = await requireTenant(tenantSlug);
  requireAdminRole(tenant.role);

  if (!process.env.EVOLUTION_API_URL || !process.env.EVOLUTION_API_KEY) {
    return {
      success: false,
      error: "Evolution API ainda não configurada no servidor (EVOLUTION_API_URL/EVOLUTION_API_KEY).",
    };
  }

  const admin = createAdminClient();
  const appUrl = (process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/+$/, "");
  const webhookUrl = `${appUrl}/api/webhooks/whatsapp-evolution`;

  const created = await createInstance(tenant.id, webhookUrl);
  if (!created.ok) {
    await admin.from("tenant_whatsapp_channels").upsert(
      {
        tenant_id: tenant.id,
        instance_name: buildInstanceName(tenant.id),
        status: "error",
        last_error: created.error,
      },
      { onConflict: "tenant_id" },
    );
    return { success: false, error: created.error };
  }

  await admin.from("tenant_whatsapp_channels").upsert(
    {
      tenant_id: tenant.id,
      instance_name: created.instanceName,
      instance_token: created.token,
      status: "qr_pending",
      last_error: null,
      qr_generated_at: new Date().toISOString(),
    },
    { onConflict: "tenant_id" },
  );

  const qr = await fetchQrCode(created.instanceName);
  if (!qr.ok) {
    return { success: false, error: qr.error };
  }
  return { success: true, qrBase64: qr.base64 };
}

export async function refreshWhatsAppQrCodeAction(
  tenantSlug: string,
): Promise<{ success: true; qrBase64: string | null } | { success: false; error: string }> {
  const tenant = await requireTenant(tenantSlug);
  requireAdminRole(tenant.role);
  const instanceName = buildInstanceName(tenant.id);
  const qr = await fetchQrCode(instanceName);
  if (!qr.ok) return { success: false, error: qr.error };
  const admin = createAdminClient();
  await admin
    .from("tenant_whatsapp_channels")
    .update({ qr_generated_at: new Date().toISOString() })
    .eq("tenant_id", tenant.id);
  return { success: true, qrBase64: qr.base64 };
}

export async function checkWhatsAppConnectionAction(
  tenantSlug: string,
): Promise<WhatsAppChannelStatus> {
  const tenant = await requireTenant(tenantSlug);
  const admin = createAdminClient();
  const { data } = await admin
    .from("tenant_whatsapp_channels")
    .select("instance_name, status, phone_number, last_error")
    .eq("tenant_id", tenant.id)
    .maybeSingle();
  if (!data) return { status: "none", phoneNumber: null, lastError: null };

  if (data.status === "qr_pending" || data.status === "pending") {
    const state = await fetchConnectionState(data.instance_name);
    if (state === "connected") {
      await admin
        .from("tenant_whatsapp_channels")
        .update({ status: "connected", connected_at: new Date().toISOString() })
        .eq("tenant_id", tenant.id);
      return { status: "connected", phoneNumber: data.phone_number, lastError: null };
    }
  }
  return {
    status: data.status as WhatsAppChannelStatus["status"],
    phoneNumber: data.phone_number,
    lastError: data.last_error,
  };
}

export async function disconnectWhatsAppChannelAction(
  tenantSlug: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const tenant = await requireTenant(tenantSlug);
  requireAdminRole(tenant.role);
  const admin = createAdminClient();
  const { error } = await admin
    .from("tenant_whatsapp_channels")
    .update({ status: "disconnected", disconnected_at: new Date().toISOString() })
    .eq("tenant_id", tenant.id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}
