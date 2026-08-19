/**
 * Sprint 35.2.3 — COMMUNICATION_MODE=disabled|test|live
 * Default: test. Esta sprint NÃO usa live.
 */

import { envFlagEnabled } from "./providers/runtime.ts";

export const COMMUNICATION_MODES = ["disabled", "test", "live"] as const;
export type CommunicationMode = (typeof COMMUNICATION_MODES)[number];

export function resolveCommunicationMode(
  env: NodeJS.ProcessEnv = process.env,
): CommunicationMode {
  const raw = (env.COMMUNICATION_MODE ?? "test").trim().toLowerCase();
  if (raw === "disabled" || raw === "live" || raw === "test") return raw;
  if (raw === "dry_run") return "test";
  return "test";
}

export function parseTestAllowlist(
  raw?: string | null,
): { phones: Set<string>; emails: Set<string> } {
  const phones = new Set<string>();
  const emails = new Set<string>();
  for (const part of (raw ?? "").split(/[,;\s]+/)) {
    const item = part.trim().toLowerCase();
    if (!item) continue;
    if (item.includes("@")) emails.add(item);
    else {
      const digits = item.replace(/\D/g, "");
      if (digits) phones.add(digits);
    }
  }
  return { phones, emails };
}

/** +5511912345678 e 11912345678 batem se ambos tiverem ≥10 dígitos. */
export function phonesAllowlistMatch(candidate: string, listedDigits: string): boolean {
  const a = (candidate ?? "").replace(/\D/g, "");
  const b = (listedDigits ?? "").replace(/\D/g, "");
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.length < 10 || b.length < 10) return false;
  return a.endsWith(b) || b.endsWith(a);
}

export function isTestAllowlisted(input: {
  phone?: string | null;
  email?: string | null;
  env?: NodeJS.ProcessEnv;
}): boolean {
  const env = input.env ?? process.env;
  const list = parseTestAllowlist(env.COMMUNICATION_TEST_ALLOWLIST);
  const phone = (input.phone ?? "").replace(/\D/g, "");
  const email = (input.email ?? "").trim().toLowerCase();
  if (phone) {
    for (const listed of list.phones) {
      if (phonesAllowlistMatch(phone, listed)) return true;
    }
  }
  if (email && list.emails.has(email)) return true;
  return false;
}

/**
 * Envio HTTP real só se: live + kill switch ON + destinatário (live)
 * ou test + allowlist + kill switch ON.
 * Default desta sprint: nunca live.
 */
export function allowRealProviderSend(input: {
  channel: "whatsapp" | "email";
  phone?: string | null;
  email?: string | null;
  env?: NodeJS.ProcessEnv;
}): boolean {
  const env = input.env ?? process.env;
  const mode = resolveCommunicationMode(env);
  if (mode === "disabled") return false;
  if (mode === "test" && !isTestAllowlisted({ ...input, env })) return false;
  if (input.channel === "whatsapp") {
    return envFlagEnabled(env.WHATSAPP_ENABLED);
  }
  return envFlagEnabled(env.EMAIL_ENABLED);
}

export function operatorChannelLabel(input: {
  communicationMode: CommunicationMode;
  configured: boolean;
  killSwitchOff: boolean;
}): "Desativado" | "Teste" | "Ativo" {
  if (!input.configured || input.communicationMode === "disabled") {
    return "Desativado";
  }
  if (input.communicationMode === "live" && !input.killSwitchOff) {
    return "Ativo";
  }
  return "Teste";
}
