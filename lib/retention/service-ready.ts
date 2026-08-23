/**
 * SERVICE_READY — capability work_orders. Visibilidade não depende de provider.
 */

import {
  canMarkAguardandoRetirada,
  isOsClosedForOperations,
} from "../ordens/os-status.ts";
import { hasCapability } from "../segments/resolve.ts";
import type { ResolvedSegmentContext } from "../segments/types.ts";

export function serviceReadyAllowed(ctx: ResolvedSegmentContext): boolean {
  if (!ctx.usesCapabilityEngine) return true;
  return hasCapability(ctx, "work_orders");
}

/** Painel de finalizar/avisar: lifecycle + RBAC. Provider OFF não esconde. */
export function canShowServiceReadyPanel(input: {
  workOrdersEnabled: boolean;
  osStatus: string;
  canFinalize: boolean;
}): boolean {
  if (!input.workOrdersEnabled || !input.canFinalize) return false;
  if (isOsClosedForOperations(input.osStatus)) return false;
  return canMarkAguardandoRetirada(input.osStatus);
}

export type ServiceReadyChannelResult = {
  channel: "whatsapp" | "email";
  status: string;
  note?: string;
};

function channelLabel(channel: "whatsapp" | "email"): string {
  return channel === "email" ? "E-mail" : "WhatsApp";
}

function channelOutcomeLine(result: ServiceReadyChannelResult): string {
  const label = channelLabel(result.channel);
  const status = result.status;
  if (status === "sent") return `${label} enviado.`;
  if (status === "delivered" || status === "read") return `${label} entregue.`;
  if (status === "blocked") return `${label} bloqueado pelo modo de teste.`;
  if (status === "failed") return `${label} falhou.`;
  if (status === "dry_run") return `${label} não enviado (dry run).`;
  if (status === "suppressed") return `${label} suprimido.`;
  if (status === "cancelled") return `${label} cancelado.`;
  if (status === "queued" || status === "ready" || status === "pending") {
    return `${label} aguardando envio.`;
  }
  return `${label}: ${status}.`;
}

export function formatServiceReadyFinalizeNote(input: {
  notify: boolean;
  requested?: Array<"whatsapp" | "email">;
  channels?: ServiceReadyChannelResult[];
  whatsappProviderConfigured?: boolean;
  emailProviderConfigured?: boolean;
  duplicated?: boolean;
}): string {
  if (!input.notify) return "Finalizado sem notificar o cliente.";
  const bits = ["Serviço finalizado."];
  const results = input.channels ?? [];
  if (results.length > 0) {
    for (const row of results) bits.push(channelOutcomeLine(row));
    return bits.join(" ");
  }
  if (input.duplicated) {
    bits.push("Aviso já registrado.");
    return bits.join(" ");
  }
  const requested = input.requested ?? [];
  if (requested.includes("whatsapp") && !input.whatsappProviderConfigured) {
    bits.push("WhatsApp não configurado.");
  }
  if (requested.includes("email") && !input.emailProviderConfigured) {
    bits.push("E-mail não configurado.");
  }
  return bits.join(" ");
}
