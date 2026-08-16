/**
 * Sprint 35.2 — Canais e modos. Default production: DRY_RUN.
 * Nunca registra DELIVERED para envio que não aconteceu.
 */

export const COMM_MODES = [
  "disabled",
  "dry_run",
  "manual_link",
  "provider",
] as const;
export type CommMode = (typeof COMM_MODES)[number];

export const OUTBOX_STATUSES = [
  "pending",
  "ready",
  "processing",
  "dry_run",
  "manual_opened",
  "sent",
  "delivered",
  "read",
  "failed",
  "cancelled",
] as const;
export type OutboxStatus = (typeof OUTBOX_STATUSES)[number];

export const COMM_CHANNELS = ["whatsapp", "email"] as const;
export type CommChannel = (typeof COMM_CHANNELS)[number];

export function resolveCommMode(envValue?: string | null): CommMode {
  const raw = (envValue ?? "dry_run").trim().toLowerCase();
  if ((COMM_MODES as readonly string[]).includes(raw)) return raw as CommMode;
  return "dry_run";
}

export type DispatchDecision =
  | { ok: true; status: OutboxStatus; note: string; waLink?: string }
  | { ok: false; status: "cancelled" | "failed"; note: string };

export function decideDispatch(input: {
  mode: CommMode;
  channel: CommChannel;
  optedIn: boolean;
  phone?: string | null;
  email?: string | null;
  message: string;
}): DispatchDecision {
  if (!input.optedIn) {
    return {
      ok: false,
      status: "cancelled",
      note: "Canal desabilitado pelo cliente (opt-out).",
    };
  }
  if (input.mode === "disabled") {
    return { ok: false, status: "cancelled", note: "Modo DISABLED." };
  }
  if (input.channel === "whatsapp" && !digitsPhone(input.phone)) {
    return { ok: false, status: "failed", note: "Telefone ausente." };
  }
  if (input.channel === "email" && !input.email?.includes("@")) {
    return { ok: false, status: "failed", note: "E-mail ausente." };
  }
  if (input.mode === "dry_run") {
    return {
      ok: true,
      status: "dry_run",
      note: "DRY_RUN — mensagem não enviada.",
    };
  }
  if (input.mode === "manual_link") {
    if (input.channel !== "whatsapp") {
      return {
        ok: true,
        status: "dry_run",
        note: "MANUAL_LINK aplica-se a WhatsApp; e-mail permanece DRY_RUN.",
      };
    }
    return {
      ok: true,
      status: "manual_opened",
      note: "Link wa.me gerado. Não é DELIVERED.",
      waLink: buildWaMeLink(input.phone ?? "", input.message),
    };
  }
  return {
    ok: true,
    status: "ready",
    note: "PROVIDER preparado — envio real exige integração aprovada.",
  };
}

export function digitsPhone(phone?: string | null): string {
  return (phone ?? "").replace(/\D/g, "");
}

export function buildWaMeLink(phone: string, message: string): string {
  const digits = digitsPhone(phone);
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export type NotificationProviderResult = {
  simulated: boolean;
  status: OutboxStatus;
  provider?: string;
  message: string;
};

export type CustomerNotificationProvider = {
  id: "whatsapp" | "email";
  dispatch(input: {
    to: string;
    body: string;
    mode: CommMode;
  }): NotificationProviderResult;
};

export const DisabledWhatsAppProvider: CustomerNotificationProvider = {
  id: "whatsapp",
  dispatch: () => ({
    simulated: true,
    status: "cancelled",
    provider: "none",
    message: "WhatsApp real desativado.",
  }),
};

export const DryRunEmailProvider: CustomerNotificationProvider = {
  id: "email",
  dispatch: () => ({
    simulated: true,
    status: "dry_run",
    provider: "none",
    message: "E-mail transacional não enviado (DRY_RUN).",
  }),
};
