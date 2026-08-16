import "server-only";

import { createAdminClient, isAdminClientAvailable } from "@/lib/supabase/admin";

import { decideDispatch, resolveCommMode } from "./channels";
import { localHourInTimezone, planRetentionNotifications } from "./job";
import { CustomerReturnService } from "./return-service";
import { CommunicationPreferenceService } from "./prefs-service";
import { NotificationOutboxService } from "./outbox-service";
import { DEFAULT_TENANT_TIMEZONE } from "@/lib/dashboard/tenant-timezone";
import { civilDateInTimezone } from "@/lib/dashboard/tenant-timezone";
import { renderTemplate, templateFor } from "./templates";
import type { CustomerReturnRow } from "./types";

/**
 * Job 35.2 — nunca envia provider real.
 * PRODUCTION: CRON disabled até homologação.
 */
export async function runRetentionJob(now = new Date()): Promise<{
  skipped?: boolean;
  reason?: string;
  planned: number;
  written: number;
}> {
  const requested = resolveCommMode(process.env.RETENTION_NOTIFY_MODE);
  if (requested === "disabled") {
    return { skipped: true, reason: "mode=disabled", planned: 0, written: 0 };
  }
  if (!isAdminClientAvailable()) {
    return {
      skipped: true,
      reason: "admin client unavailable",
      planned: 0,
      written: 0,
    };
  }
  const admin = createAdminClient();
  const today = civilDateInTimezone(now, DEFAULT_TENANT_TIMEZONE);
  const hour = localHourInTimezone(now, DEFAULT_TENANT_TIMEZONE);

  const { data, error } = await admin
    .from("customer_returns" as never)
    .select("tenant_id")
    .gte("due_at", new Date(Date.parse(`${today}T12:00:00`) - 20 * 86400000)
      .toISOString()
      .slice(0, 10))
    .lte("due_at", new Date(Date.parse(`${today}T12:00:00`) + 10 * 86400000)
      .toISOString()
      .slice(0, 10))
    .limit(2000);
  if (error) {
    return { skipped: true, reason: error.message, planned: 0, written: 0 };
  }
  const tenantIds = [
    ...new Set(
      (data ?? []).map((r) => String((r as { tenant_id: string }).tenant_id)),
    ),
  ];
  let planned = 0;
  let written = 0;
  for (const tenantId of tenantIds) {
    const { data: tenant } = await admin
      .from("tenants")
      .select("id, segment, name")
      .eq("id", tenantId)
      .maybeSingle();
    const returnsSvc = new CustomerReturnService(admin, tenantId);
    const rows = await returnsSvc.list();
    const outbox = new NotificationOutboxService(admin, tenantId);
    const keys = await outbox.listKeys();
    const items = planRetentionNotifications({
      tenantId,
      todayCivil: today,
      hourLocal: hour,
      segment: tenant?.segment ?? null,
      returns: rows as CustomerReturnRow[],
      existingKeys: keys,
    });
    planned += items.length;
    const prefs = new CommunicationPreferenceService(admin, tenantId);
    for (const item of items) {
      const row = rows.find((r) => r.id === item.entityId);
      if (!row) continue;
      const p = await prefs.get(item.clienteId);
      const { data: cliente } = await admin
        .from("clientes")
        .select("nome, telefone, whatsapp, email")
        .eq("tenant_id", tenantId)
        .eq("id", item.clienteId)
        .maybeSingle();
      const hide = Boolean(row.hide_procedure);
      const message = renderTemplate(
        templateFor({
          code: item.templateCode,
          segment: tenant?.segment,
          hideProcedure: hide,
        }),
        {
          cliente_nome: cliente?.nome ?? "",
          empresa_nome: tenant?.name ?? "",
          data: row.due_at,
          servico: hide ? "" : (row.last_service_label ?? ""),
          veiculo: row.veiculo_label ?? "",
          placa: row.placa ?? "",
        },
      );
      const decision = decideDispatch({
        mode: "dry_run",
        channel: item.channel,
        optedIn: prefs.isChannelAllowed(p, item.channel),
        phone: cliente?.whatsapp ?? cliente?.telefone,
        email: cliente?.email,
        message,
      });
      void decision;
      const res = await outbox.enqueue({
        clienteId: item.clienteId,
        channel: item.channel,
        templateCode: item.templateCode,
        offsetKey: item.offsetKey,
        entityType: "retorno",
        entityId: item.entityId,
        idempotencyKey: item.idempotencyKey,
        message,
        phone: cliente?.whatsapp ?? cliente?.telefone,
        email: cliente?.email,
        optedIn: prefs.isChannelAllowed(p, item.channel),
        mode: "dry_run",
      });
      if (!res.duplicated) written += 1;
    }
  }
  return { planned, written };
}
