import "server-only";

import { communicationIdempotencyKey } from "./idempotency";
import { createCommunicationPreferenceService } from "./prefs-service";
import { createNotificationOutboxService } from "./outbox-service";
import { createCommunicationSettingsService } from "./settings-service";
import {
  commModeFromEmail,
  commModeFromWhatsApp,
  effectiveEmailMode,
  effectiveWhatsAppMode,
} from "./providers/runtime";
import {
  automationEventEnabled,
  pickChannels,
} from "./settings";
import { shouldHaltRateLimit } from "./rate-limit";
import { renderTemplate, templateFor, type MessageTemplateCode } from "./templates";
import type { CommChannel } from "./channels";
import { originFromTemplate } from "./origin";
import { correlationId } from "./observability";
import { NO_CHANNEL_OPERATOR_COPY } from "./center";

export type NotifyChannelResult = {
  channel: CommChannel;
  status: string;
  note: string;
};

export type NotifyEnqueueResult = {
  duplicated: boolean;
  status: string;
  note: string;
  waLink?: string;
  channel: CommChannel | null;
  channels: NotifyChannelResult[];
};

export async function enqueueCustomerNotification(input: {
  tenantId: string;
  tenantName: string;
  segment?: string | null;
  clienteId: string;
  entityType: "retorno" | "agendamento" | "os";
  entityId: string;
  templateCode: MessageTemplateCode;
  offsetKey: string;
  messageCtx: Record<string, string>;
  hideProcedure?: boolean;
  userId?: string | null;
  forceChannel?: CommChannel;
  /** Clique do operador: ignora preferência automática do tenant. */
  explicit?: boolean;
}): Promise<NotifyEnqueueResult> {
  const settingsSvc = await createCommunicationSettingsService(input.tenantId);
  const settings = await settingsSvc.get();
  if (!input.explicit && !automationEventEnabled(settings, input.templateCode)) {
    return {
      duplicated: false,
      status: "cancelled",
      note: "Preferência automática desligada para este evento.",
      channel: null,
      channels: [],
    };
  }
  const prefsSvc = await createCommunicationPreferenceService(input.tenantId);
  const prefs = await prefsSvc.get(input.clienteId);
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data: cliente } = await supabase
    .from("clientes")
    .select("nome, telefone, whatsapp, email")
    .eq("tenant_id", input.tenantId)
    .eq("id", input.clienteId)
    .maybeSingle();
  if (!cliente) {
    return {
      duplicated: false,
      status: "failed",
      note: "Cliente não encontrado neste tenant.",
      channel: null,
      channels: [],
    };
  }
  const message = renderTemplate(
    templateFor({
      code: input.templateCode,
      segment: input.segment,
      hideProcedure: input.hideProcedure,
    }),
    {
      ...input.messageCtx,
      cliente_nome: cliente.nome ?? input.messageCtx.cliente_nome ?? "",
      empresa_nome: input.tenantName,
      data_hora:
        input.messageCtx.data_hora ||
        [input.messageCtx.data, input.messageCtx.hora].filter(Boolean).join(" às "),
    },
  );
  const phone = cliente.whatsapp ?? cliente.telefone;
  const email = cliente.email;
  const channels = input.forceChannel
    ? [input.forceChannel]
    : pickChannels({
        settings,
        preferred: settings.preferredChannel,
        whatsappAvailable: Boolean(phone),
        emailAvailable: Boolean(email?.includes("@")),
        explicit: input.explicit,
      });
  const outbox = await createNotificationOutboxService(input.tenantId);
  if (channels.length === 0) {
    const res = await outbox.enqueue({
      clienteId: input.clienteId,
      channel: "whatsapp",
      templateCode: input.templateCode,
      offsetKey: input.offsetKey,
      entityType: input.entityType,
      entityId: input.entityId,
      idempotencyKey: communicationIdempotencyKey({
        tenantId: input.tenantId,
        clienteId: input.clienteId,
        entityType: input.entityType,
        entityId: input.entityId,
        templateCode: input.templateCode,
        offsetKey: input.offsetKey,
        channel: "whatsapp",
      }),
      message,
      phone,
      email,
      optedIn: true,
      mode: commModeFromWhatsApp(effectiveWhatsAppMode()),
      userId: input.userId,
      originKind: originFromTemplate(input.templateCode),
      correlationId: correlationId(),
    });
    return {
      duplicated: res.duplicated,
      status: "suppressed",
      note: NO_CHANNEL_OPERATOR_COPY,
      channel: null,
      channels: [],
    };
  }
  const recent = await outbox.countRecent(1);
  const halt = shouldHaltRateLimit({ sentLastHour: recent });
  if (halt.halt) {
    return {
      duplicated: false,
      status: "failed",
      note: halt.note,
      channel: null,
      channels: [],
    };
  }
  const collected: NotifyChannelResult[] = [];
  let last: NotifyEnqueueResult = {
    duplicated: false,
    status: "cancelled",
    note: "Sem envio.",
    channel: null,
    channels: [],
  };
  for (const channel of channels) {
    const optedIn = prefsSvc.isChannelAllowed(prefs, channel);
    const mode =
      channel === "whatsapp"
        ? commModeFromWhatsApp(effectiveWhatsAppMode())
        : commModeFromEmail(effectiveEmailMode());
    const res = await outbox.enqueue({
      clienteId: input.clienteId,
      channel,
      templateCode: input.templateCode,
      offsetKey: input.offsetKey,
      entityType: input.entityType,
      entityId: input.entityId,
      idempotencyKey: communicationIdempotencyKey({
        tenantId: input.tenantId,
        clienteId: input.clienteId,
        entityType: input.entityType,
        entityId: input.entityId,
        templateCode: input.templateCode,
        offsetKey: input.offsetKey,
        channel,
      }),
      message,
      phone,
      email,
      optedIn,
      mode,
      userId: input.userId,
      originKind: originFromTemplate(input.templateCode),
      correlationId: correlationId(),
    });
    collected.push({ channel, status: res.status, note: res.note });
    last = {
      duplicated: res.duplicated,
      status: res.status,
      note:
        res.status === "suppressed" && /ausente|sem canal/i.test(res.note)
          ? NO_CHANNEL_OPERATOR_COPY
          : res.note,
      waLink: res.waLink,
      channel,
      channels: collected,
    };
  }
  return last;
}
