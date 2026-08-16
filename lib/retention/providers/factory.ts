import type { CommChannel } from "../channels.ts";
import {
  effectiveEmailMode,
  effectiveWhatsAppMode,
} from "./runtime.ts";
import {
  DisabledEmailAdapter,
  DryRunEmailAdapter,
  createResendEmailAdapter,
} from "./email.ts";
import {
  DisabledWhatsAppAdapter,
  DryRunWhatsAppAdapter,
  ManualLinkWhatsAppAdapter,
} from "./whatsapp.ts";
import { createMetaCloudWhatsAppAdapter } from "./whatsapp-meta.ts";
import type { NotificationProvider } from "./types.ts";

export function createWhatsAppProvider(
  env: NodeJS.ProcessEnv = process.env,
): NotificationProvider {
  const mode = effectiveWhatsAppMode(env);
  if (mode === "disabled") return DisabledWhatsAppAdapter;
  if (mode === "manual_link") return ManualLinkWhatsAppAdapter;
  if (mode === "meta_cloud") return createMetaCloudWhatsAppAdapter(env);
  return DryRunWhatsAppAdapter;
}

export function createEmailProvider(
  env: NodeJS.ProcessEnv = process.env,
): NotificationProvider {
  const mode = effectiveEmailMode(env);
  if (mode === "disabled") return DisabledEmailAdapter;
  if (mode === "provider") return createResendEmailAdapter(env);
  return DryRunEmailAdapter;
}

export function createChannelProvider(
  channel: CommChannel,
  env: NodeJS.ProcessEnv = process.env,
): NotificationProvider {
  return channel === "email" ? createEmailProvider(env) : createWhatsAppProvider(env);
}
