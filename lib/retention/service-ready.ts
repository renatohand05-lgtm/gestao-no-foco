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

export function formatServiceReadyFinalizeNote(input: {
  notify: boolean;
  requested: Array<"whatsapp" | "email">;
  whatsappProviderConfigured: boolean;
  emailProviderConfigured: boolean;
  duplicated?: boolean;
}): string {
  if (!input.notify) return "Finalizado sem notificar o cliente.";
  if (input.duplicated) return "Serviço finalizado. Aviso já registrado.";
  const bits = ["Serviço finalizado."];
  if (input.requested.includes("whatsapp") && !input.whatsappProviderConfigured) {
    bits.push("WhatsApp não configurado.");
  }
  if (input.requested.includes("email") && !input.emailProviderConfigured) {
    bits.push("E-mail não configurado.");
  }
  return bits.join(" ");
}
