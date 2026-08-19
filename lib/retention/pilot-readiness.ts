/**
 * Auditoria 35.3 — só nomes de env e estados. Nunca loga valores/secrets.
 */

import { envFlagEnabled } from "./providers/runtime.ts";
import { resolveCommunicationMode } from "./test-mode.ts";

export type ConfigPresence = "CONFIGURED" | "MISSING" | "MANUAL REQUIRED";

function present(value?: string | null): boolean {
  return Boolean((value ?? "").trim());
}

function flag(value?: string | null): ConfigPresence {
  return envFlagEnabled(value) ? "CONFIGURED" : "MANUAL REQUIRED";
}

function secret(value?: string | null): ConfigPresence {
  return present(value) ? "CONFIGURED" : "MISSING";
}

export function whatsappConfigAudit(env: NodeJS.ProcessEnv = process.env) {
  return {
    WHATSAPP_ENABLED: flag(env.WHATSAPP_ENABLED),
    WHATSAPP_PROVIDER: present(env.WHATSAPP_PROVIDER) ? "CONFIGURED" : "MISSING",
    WHATSAPP_ACCESS_TOKEN: secret(env.WHATSAPP_ACCESS_TOKEN),
    WHATSAPP_PHONE_NUMBER_ID: present(env.WHATSAPP_PHONE_NUMBER_ID)
      ? "CONFIGURED"
      : "MISSING",
    WHATSAPP_BUSINESS_ACCOUNT_ID: present(env.WHATSAPP_BUSINESS_ACCOUNT_ID)
      ? "CONFIGURED"
      : "MISSING",
    WHATSAPP_WEBHOOK_VERIFY_TOKEN: secret(env.WHATSAPP_WEBHOOK_VERIFY_TOKEN),
    WHATSAPP_APP_SECRET: secret(env.WHATSAPP_APP_SECRET),
  };
}

export function emailConfigAudit(env: NodeJS.ProcessEnv = process.env) {
  return {
    EMAIL_ENABLED: flag(env.EMAIL_ENABLED),
    EMAIL_PROVIDER: present(env.EMAIL_PROVIDER) ? "CONFIGURED" : "MISSING",
    RESEND_API_KEY: secret(env.RESEND_API_KEY),
    EMAIL_FROM: present(env.EMAIL_FROM) ? "CONFIGURED" : "MISSING",
    EMAIL_REPLY_TO: present(env.EMAIL_REPLY_TO) ? "CONFIGURED" : "MISSING",
  };
}

export function communicationModeAudit(env: NodeJS.ProcessEnv = process.env) {
  const mode = resolveCommunicationMode(env);
  return {
    COMMUNICATION_MODE: mode,
    LIVE: mode === "live" ? "ON" : "OFF",
    ALLOWLIST: present(env.COMMUNICATION_TEST_ALLOWLIST)
      ? "CONFIGURED"
      : "MISSING",
  };
}
