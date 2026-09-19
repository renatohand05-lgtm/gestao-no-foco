"use server";

import { isPlatformOwner } from "@/lib/platform/platform-access-service";
import {
  checkWhatsAppPhoneStatus,
  registerWhatsAppNumber,
  sendWhatsAppTestMessage,
  type WhatsAppPhoneStatus,
} from "@/lib/retention/providers/whatsapp-diagnostics";
import { actionFail, actionOk, type ActionResult } from "@/types/action-result";

export async function checkWhatsAppStatusAction(): Promise
  { success: true; data: WhatsAppPhoneStatus } | { success: false; error: string }
> {
  const isOwner = await isPlatformOwner();
  if (!isOwner) return { success: false, error: "Sem permissão." };

  const status = await checkWhatsAppPhoneStatus();
  if (!status.ok) {
    return { success: false, error: status.error ?? "Falha ao consultar status." };
  }
  return { success: true, data: status };
}

export async function registerWhatsAppNumberAction(
  pin: string,
): Promise<ActionResult> {
  const isOwner = await isPlatformOwner();
  if (!isOwner) return actionFail("Sem permissão.");

  const result = await registerWhatsAppNumber(pin);
  if (!result.ok) return actionFail(result.error);
  return actionOk();
}

export async function sendWhatsAppTestMessageAction(
  toPhoneDigits: string,
): Promise<ActionResult> {
  const isOwner = await isPlatformOwner();
  if (!isOwner) return actionFail("Sem permissão.");

  const digits = toPhoneDigits.replace(/\D/g, "");
  if (digits.length < 10) {
    return actionFail("Telefone inválido — use DDI+DDD+número (ex: 5511999998888).");
  }

  const result = await sendWhatsAppTestMessage(digits);
  if (!result.ok) return actionFail(result.error);
  return actionOk(result.providerMessageId);
}
