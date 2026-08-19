/**
 * Sprint 35.2.3 — reenvio manual na mesma linha. Sem duplicar.
 */

export function canManualResend(input: {
  actorTenantId: string;
  rowTenantId: string;
  status: string;
  failureKind?: string | null;
  optedIn: boolean;
  hasDestination: boolean;
}): { ok: boolean; note: string } {
  if (input.actorTenantId !== input.rowTenantId) {
    return { ok: false, note: "Mensagem de outro tenant." };
  }
  if (input.status === "delivered" || input.status === "read") {
    return { ok: false, note: "Mensagem já entregue — reenvio bloqueado." };
  }
  if (input.status === "sent") {
    return { ok: false, note: "Mensagem já enviada — não duplicar." };
  }
  if (input.status !== "failed") {
    return { ok: false, note: "Só é possível reenviar mensagens que falharam." };
  }
  if (input.failureKind === "permanent" || input.failureKind === "blocked_by_allowlist") {
    return { ok: false, note: "Falha permanente — reenvio automático e manual bloqueados." };
  }
  if (!input.optedIn) {
    return { ok: false, note: "Cliente optou por não receber este canal." };
  }
  if (!input.hasDestination) {
    return { ok: false, note: "Cliente sem canal de comunicação disponível." };
  }
  return { ok: true, note: "" };
}
