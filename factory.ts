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

/**
 * Versão por tenant: se o tenant tiver um canal Evolution API próprio
 * conectado, usa ele (independente do modo global). Senão, cai no
 * comportamento de sempre (createWhatsAppProvider). Aditivo — não muda nada
 * para tenants sem canal próprio.
 */
export async function createWhatsAppProviderForTenant(
  tenantId: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<NotificationProvider> {
  // Import dinâmico: este módulo puxa "server-only"/cliente admin, que só
  // deve carregar quando realmente formos checar o canal do tenant — nunca
  // no carregamento estático deste factory (quebraria modos que nem usam
  // Evolution API, ex.: disabled/dry_run/manual_link/meta_cloud).
  const { createEvolutionWhatsAppAdapter, getTenantWhatsAppChannel } = await import(
    "./whatsapp-evolution.ts"
  );
  const channel = await getTenantWhatsAppChannel(tenantId);
  if (channel && channel.status === "connected") {
    return createEvolutionWhatsAppAdapter(channel);
  }
  return createWhatsAppProvider(env);
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
