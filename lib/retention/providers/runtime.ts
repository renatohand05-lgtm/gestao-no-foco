/**
 * Sprint 35.2.2 — Runtime de providers. Kill switch default OFF.
 * Nenhum secret é logado. Valores reais não entram em git.
 */

export const WHATSAPP_PROVIDER_MODES = [
  "disabled",
  "dry_run",
  "manual_link",
  "meta_cloud",
] as const;
export type WhatsAppProviderMode = (typeof WHATSAPP_PROVIDER_MODES)[number];

export const EMAIL_PROVIDER_MODES = ["disabled", "dry_run", "provider"] as const;
export type EmailProviderMode = (typeof EMAIL_PROVIDER_MODES)[number];

export const PROVIDER_HEALTH = [
  "NOT_CONFIGURED",
  "CONFIGURED",
  "VALIDATED",
  "ERROR",
] as const;
export type ProviderHealthStatus = (typeof PROVIDER_HEALTH)[number];

export function envFlagEnabled(value?: string | null): boolean {
  const raw = (value ?? "").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

/** Extrai o endereço de EMAIL_FROM (suporta `Nome <email@dominio.com>`). */
export function resolveEmailFromAddress(raw?: string | null): string {
  const value = (raw ?? "").trim();
  const angle = value.match(/<([^>]+)>/);
  const candidate = (angle?.[1] ?? value).trim();
  return candidate.includes("@") ? candidate : "";
}

export function emailFromConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.RESEND_API_KEY && resolveEmailFromAddress(env.EMAIL_FROM));
}

/** Kill switch global. Ausente = OFF. */
export function isWhatsAppKillSwitchOff(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return !envFlagEnabled(env.WHATSAPP_ENABLED);
}

export function isEmailKillSwitchOff(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return !envFlagEnabled(env.EMAIL_ENABLED);
}

export function resolveWhatsAppProviderMode(
  env: NodeJS.ProcessEnv = process.env,
): WhatsAppProviderMode {
  const explicit = (env.WHATSAPP_PROVIDER ?? "").trim().toLowerCase();
  if (explicit === "meta_cloud" || explicit === "provider") return "meta_cloud";
  if (explicit === "manual_link") return "manual_link";
  if (explicit === "disabled") return "disabled";
  if (explicit === "dry_run") return "dry_run";
  if (envFlagEnabled(env.WHATSAPP_ENABLED)) return "meta_cloud";
  const fallback = (env.RETENTION_NOTIFY_MODE ?? "dry_run").trim().toLowerCase();
  if (fallback === "meta_cloud" || fallback === "provider") return "meta_cloud";
  if (fallback === "manual_link") return "manual_link";
  if (fallback === "disabled") return "disabled";
  return "dry_run";
}

export function resolveEmailProviderMode(
  env: NodeJS.ProcessEnv = process.env,
): EmailProviderMode {
  const explicit = (env.EMAIL_PROVIDER ?? "").trim().toLowerCase();
  if (explicit === "resend" || explicit === "provider") return "provider";
  if (explicit === "disabled") return "disabled";
  if (explicit === "dry_run") return "dry_run";
  if (envFlagEnabled(env.EMAIL_ENABLED)) return "provider";
  return "dry_run";
}

/**
 * Modo efetivo: kill switch vence provider real.
 * MANUAL_LINK continua gerando wa.me mesmo com kill switch OFF.
 */
export function effectiveWhatsAppMode(
  env: NodeJS.ProcessEnv = process.env,
): WhatsAppProviderMode {
  const mode = resolveWhatsAppProviderMode(env);
  if (mode === "meta_cloud" && isWhatsAppKillSwitchOff(env)) return "dry_run";
  return mode;
}

export function effectiveEmailMode(
  env: NodeJS.ProcessEnv = process.env,
): EmailProviderMode {
  const mode = resolveEmailProviderMode(env);
  if (mode === "provider" && isEmailKillSwitchOff(env)) return "dry_run";
  return mode;
}

export type ChannelHealth = {
  status: ProviderHealthStatus;
  label: string;
  canSendReal: boolean;
};

export function whatsappHealth(
  env: NodeJS.ProcessEnv = process.env,
): ChannelHealth {
  const mode = effectiveWhatsAppMode(env);
  if (mode === "disabled") {
    return { status: "NOT_CONFIGURED", label: "Desligado", canSendReal: false };
  }
  if (mode === "dry_run") {
    return { status: "CONFIGURED", label: "Dry run", canSendReal: false };
  }
  if (mode === "manual_link") {
    return { status: "CONFIGURED", label: "Link manual", canSendReal: false };
  }
  const configured = Boolean(
    env.WHATSAPP_ACCESS_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID,
  );
  if (!configured) {
    return {
      status: "NOT_CONFIGURED",
      label: "Não configurado",
      canSendReal: false,
    };
  }
  return {
    status: "CONFIGURED",
    label: "Ativo (Meta Cloud — homologação)",
    canSendReal: !isWhatsAppKillSwitchOff(env),
  };
}

export function emailHealth(env: NodeJS.ProcessEnv = process.env): ChannelHealth {
  const mode = effectiveEmailMode(env);
  if (mode === "disabled") {
    return { status: "NOT_CONFIGURED", label: "Desligado", canSendReal: false };
  }
  if (mode === "dry_run") {
    return { status: "CONFIGURED", label: "Dry run", canSendReal: false };
  }
  const configured = emailFromConfigured(env);
  if (!configured) {
    return {
      status: "NOT_CONFIGURED",
      label: "Não configurado",
      canSendReal: false,
    };
  }
  return {
    status: "CONFIGURED",
    label: "Ativo (Resend — homologação)",
    canSendReal: !isEmailKillSwitchOff(env),
  };
}

export function sanitizeProviderError(message: string): string {
  return message
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/sk_[A-Za-z0-9]+/g, "[redacted]")
    .replace(/re_[A-Za-z0-9]+/g, "[redacted]")
    .slice(0, 240);
}

export function commModeFromWhatsApp(
  mode: ReturnType<typeof effectiveWhatsAppMode>,
): "disabled" | "dry_run" | "manual_link" | "provider" {
  if (mode === "meta_cloud") return "provider";
  return mode;
}

export function commModeFromEmail(
  mode: ReturnType<typeof effectiveEmailMode>,
): "disabled" | "dry_run" | "provider" {
  return mode;
}

export const COMMUNICATION_ENV_NAMES = [
  "RETENTION_NOTIFY_MODE",
  "COMMUNICATION_MODE",
  "COMMUNICATION_TEST_ALLOWLIST",
  "WHATSAPP_ENABLED",
  "WHATSAPP_PROVIDER",
  "WHATSAPP_ACCESS_TOKEN",
  "WHATSAPP_PHONE_NUMBER_ID",
  "WHATSAPP_BUSINESS_ACCOUNT_ID",
  "WHATSAPP_WEBHOOK_VERIFY_TOKEN",
  "WHATSAPP_APP_SECRET",
  "EMAIL_ENABLED",
  "EMAIL_PROVIDER",
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "EMAIL_REPLY_TO",
  "CRON_SECRET",
] as const;
