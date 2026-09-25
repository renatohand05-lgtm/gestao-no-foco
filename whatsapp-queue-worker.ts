/**
 * Worker da fila de WhatsApp por tenant (Evolution API).
 * Chamado por um cron curto (ex.: a cada 1-2 min). O próprio intervalo do
 * cron é o "delay aleatório" entre mensagens — cada execução despacha no
 * máximo 1 mensagem por canal conectado, respeitando warm-up, horário
 * comercial e limite diário. Isso evita o padrão de disparo em massa que a
 * Meta/WhatsApp usa pra detectar automação e banir números.
 *
 * Não roda nada além de mensagens transacionais (OS pronta, agendamento) —
 * quem decide o conteúdo é o chamador que enfileirou; este worker só
 * desenfileira em ritmo seguro.
 */
import "server-only";

import { createAdminClient } from "../supabase/admin.ts";
import { sendEvolutionMessage } from "./providers/whatsapp-evolution.ts";

/**
 * Cronograma de aquecimento por dias desde o primeiro envio real.
 * Conservador de propósito: é canal transacional, não ferramenta de disparo.
 */
export function warmupDailyLimit(daysSinceFirstSend: number | null): number {
  if (daysSinceFirstSend === null) return 10; // ainda não enviou nada
  if (daysSinceFirstSend <= 1) return 15;
  if (daysSinceFirstSend <= 3) return 30;
  if (daysSinceFirstSend <= 7) return 60;
  if (daysSinceFirstSend <= 14) return 120;
  return 200;
}

export function isWithinBusinessWindow(
  date: Date,
  startHour: number,
  endHour: number,
): boolean {
  const hour = date.getHours();
  return hour >= startHour && hour < endHour;
}

function daysBetween(from: string | null, now: Date): number | null {
  if (!from) return null;
  const start = Date.parse(from);
  if (!Number.isFinite(start)) return null;
  return Math.floor((now.getTime() - start) / 86_400_000);
}

type ChannelRow = {
  id: string;
  tenant_id: string;
  instance_name: string;
  status: string;
  daily_send_limit: number;
  messages_sent_today: number;
  daily_counter_date: string | null;
  first_send_at: string | null;
};

export type WorkerRunSummary = {
  channelsChecked: number;
  sent: number;
  failed: number;
  skippedWindow: number;
  skippedLimit: number;
};

export async function processWhatsAppQueueOnce(
  env: NodeJS.ProcessEnv = process.env,
  now: Date = new Date(),
): Promise<WorkerRunSummary> {
  const admin = createAdminClient();
  const summary: WorkerRunSummary = {
    channelsChecked: 0,
    sent: 0,
    failed: 0,
    skippedWindow: 0,
    skippedLimit: 0,
  };

  const { data: channels } = await admin
    .from("tenant_whatsapp_channels")
    .select(
      "id, tenant_id, instance_name, status, daily_send_limit, messages_sent_today, daily_counter_date, first_send_at",
    )
    .eq("status", "connected");

  if (!channels || channels.length === 0) return summary;

  const todayIso = now.toISOString().slice(0, 10);

  for (const channel of channels as ChannelRow[]) {
    summary.channelsChecked += 1;

    // Reset do contador diário se virou o dia.
    let messagesSentToday = channel.messages_sent_today;
    if (channel.daily_counter_date !== todayIso) {
      messagesSentToday = 0;
      await admin
        .from("tenant_whatsapp_channels")
        .update({ messages_sent_today: 0, daily_counter_date: todayIso })
        .eq("id", channel.id);
    }

    // Janela comercial: 8h-19h por padrão (settings finas ficam para depois).
    if (!isWithinBusinessWindow(now, 8, 19)) {
      summary.skippedWindow += 1;
      continue;
    }

    const days = daysBetween(channel.first_send_at, now);
    const effectiveLimit = Math.min(channel.daily_send_limit, warmupDailyLimit(days));
    if (messagesSentToday >= effectiveLimit) {
      summary.skippedLimit += 1;
      continue;
    }

    // No máximo 1 mensagem por canal por execução — o intervalo do cron
    // já é o espaçamento entre envios.
    const { data: queued } = await admin
      .from("whatsapp_send_queue")
      .select("id, to_address, body, outbox_id, attempt_count")
      .eq("channel_id", channel.id)
      .eq("status", "queued")
      .lte("scheduled_for", now.toISOString())
      .order("created_at", { ascending: true })
      .limit(1);

    const item = queued?.[0];
    if (!item) continue;

    await admin
      .from("whatsapp_send_queue")
      .update({ status: "sending" })
      .eq("id", item.id);

    const result = await sendEvolutionMessage(channel.instance_name, item.to_address, item.body, env);

    if (result.status === "sent") {
      summary.sent += 1;
      await admin
        .from("whatsapp_send_queue")
        .update({ status: "sent", sent_at: now.toISOString() })
        .eq("id", item.id);
      await admin
        .from("tenant_whatsapp_channels")
        .update({
          messages_sent_today: messagesSentToday + 1,
          daily_counter_date: todayIso,
          first_send_at: channel.first_send_at ?? now.toISOString(),
        })
        .eq("id", channel.id);
      if (item.outbox_id) {
        await admin
          .from("notification_outbox")
          .update({
            status: "sent",
            provider: "evolution",
            provider_message_id: result.providerMessageId ?? null,
            sent_at: now.toISOString(),
          })
          .eq("id", item.outbox_id);
      }
    } else {
      summary.failed += 1;
      const attempts = (item.attempt_count ?? 0) + 1;
      const giveUp = attempts >= 3;
      await admin
        .from("whatsapp_send_queue")
        .update({
          status: giveUp ? "failed" : "queued",
          attempt_count: attempts,
          last_error: result.message,
          scheduled_for: giveUp
            ? undefined
            : new Date(now.getTime() + attempts * 5 * 60_000).toISOString(),
        })
        .eq("id", item.id);
      if (giveUp && item.outbox_id) {
        await admin
          .from("notification_outbox")
          .update({ status: "failed", error_code: result.errorCode ?? null, failed_at: now.toISOString() })
          .eq("id", item.outbox_id);
      }
    }
  }

  return summary;
}
