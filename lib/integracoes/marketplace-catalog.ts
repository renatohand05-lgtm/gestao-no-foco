/**
 * Sprint 30.8 / 30.8.1 — Marketplace catalog-only (active: false sempre).
 */

import type { AuthMethod, MarketplaceCategory, MarketplaceEntry } from "./types.ts";

function entry(
  id: string,
  name: string,
  vendor: string,
  category: MarketplaceCategory,
  description: string,
  authExpected: AuthMethod = "oauth",
  capabilities: readonly string[] = ["catalog"],
): MarketplaceEntry {
  return {
    id,
    name,
    vendor,
    category,
    status: "catalog",
    description,
    active: false,
    authExpected,
    capabilities,
  };
}

export const MARKETPLACE_CATALOG: readonly MarketplaceEntry[] = [
  // ERP
  entry("erp-conta-azul", "Conta Azul", "Conta Azul", "erp", "Catálogo — sync futuro.", "oauth", ["sync", "catalog"]),
  entry("erp-omie", "Omie", "Omie", "erp", "Catálogo — sync futuro.", "api_key", ["sync", "catalog"]),
  entry("erp-bling", "Bling", "Bling", "erp", "Catálogo — sync futuro.", "oauth", ["sync", "catalog"]),
  entry("erp-tiny", "Tiny", "Tiny", "erp", "Catálogo — sync futuro.", "oauth", ["sync", "catalog"]),
  entry("erp-sap", "SAP", "SAP", "erp", "Catálogo — sync futuro.", "oauth", ["sync", "catalog"]),
  entry("erp-totvs", "TOTVS", "TOTVS", "erp", "Catálogo — sync futuro.", "oauth", ["sync", "catalog"]),
  // Marketplace
  entry("mkt-ml", "Mercado Livre", "Mercado Livre", "marketplace", "Catálogo.", "oauth", ["orders", "catalog"]),
  entry("mkt-shopee", "Shopee", "Shopee", "marketplace", "Catálogo.", "oauth", ["orders", "catalog"]),
  entry("mkt-amazon", "Amazon", "Amazon", "marketplace", "Catálogo.", "oauth", ["orders", "catalog"]),
  entry("mkt-magalu", "Magalu", "Magazine Luiza", "marketplace", "Catálogo.", "oauth", ["orders", "catalog"]),
  // WhatsApp
  entry("wa-meta", "WhatsApp Meta", "Meta", "whatsapp", "Catálogo — sem canal ativo.", "oauth", ["messaging", "catalog"]),
  entry("wa-twilio", "WhatsApp Twilio", "Twilio", "whatsapp", "Catálogo.", "api_key", ["messaging", "catalog"]),
  entry("wa-evolution", "Evolution API", "Evolution", "whatsapp", "Catálogo.", "api_key", ["messaging", "catalog"]),
  // Email
  entry("email-resend", "Resend", "Resend", "email", "Catálogo.", "api_key", ["email", "catalog"]),
  entry("email-sendgrid", "Sendgrid", "Sendgrid", "email", "Catálogo.", "api_key", ["email", "catalog"]),
  entry("email-ses", "Amazon SES", "AWS", "email", "Catálogo.", "api_key", ["email", "catalog"]),
  // SMS
  entry("sms-zenvia", "Zenvia", "Zenvia", "sms", "Catálogo.", "api_key", ["sms", "catalog"]),
  entry("sms-sns", "AWS SNS", "AWS", "sms", "Catálogo.", "api_key", ["sms", "catalog"]),
  // Pagamento
  entry("pay-stripe", "Stripe", "Stripe", "pagamento", "Catálogo — sem cobrança.", "oauth", ["payments", "catalog"]),
  entry("pay-mp", "Mercado Pago", "Mercado Pago", "pagamento", "Catálogo.", "oauth", ["payments", "catalog"]),
  entry("pay-asaas", "Asaas", "Asaas", "pagamento", "Catálogo.", "api_key", ["payments", "catalog"]),
  entry("pay-pagarme", "Pagar.me", "Pagar.me", "pagamento", "Catálogo.", "api_key", ["payments", "catalog"]),
  entry("pay-pix", "Pix", "BACEN", "pagamento", "Catálogo.", "api_key", ["payments", "catalog"]),
  // Open Finance / Bancos
  entry("of-open", "Open Finance", "Open Finance BR", "open_finance", "Catálogo.", "oauth", ["banking", "catalog"]),
  entry("bank-bb", "Banco do Brasil", "BB", "bancos", "Catálogo.", "oauth", ["banking", "catalog"]),
  entry("bank-itau", "Itaú", "Itaú", "bancos", "Catálogo.", "oauth", ["banking", "catalog"]),
  entry("bank-bradesco", "Bradesco", "Bradesco", "bancos", "Catálogo.", "oauth", ["banking", "catalog"]),
  entry("bank-santander", "Santander", "Santander", "bancos", "Catálogo.", "oauth", ["banking", "catalog"]),
  entry("bank-sicoob", "Sicoob", "Sicoob", "bancos", "Catálogo.", "oauth", ["banking", "catalog"]),
  entry("bank-sicredi", "Sicredi", "Sicredi", "bancos", "Catálogo.", "oauth", ["banking", "catalog"]),
  entry("bank-ob", "Open Banking", "Open Banking", "bancos", "Catálogo.", "oauth", ["banking", "catalog"]),
  // Fiscal
  entry("fis-nfe", "NFe", "SEFAZ", "fiscal", "Catálogo.", "certificate_planned", ["fiscal", "catalog"]),
  entry("fis-nfse", "NFSe", "Prefeituras", "fiscal", "Catálogo.", "certificate_planned", ["fiscal", "catalog"]),
  entry("fis-cte", "CT-e", "SEFAZ", "fiscal", "Catálogo.", "certificate_planned", ["fiscal", "catalog"]),
  entry("fis-sefaz", "SEFAZ", "SEFAZ", "fiscal", "Catálogo.", "certificate_planned", ["fiscal", "catalog"]),
  // Google
  entry("g-drive", "Google Drive", "Google", "google", "Catálogo.", "oauth", ["files", "catalog"]),
  entry("g-cal", "Google Calendar", "Google", "google", "Catálogo.", "oauth", ["calendar", "catalog"]),
  entry("g-gmail", "Gmail", "Google", "google", "Catálogo.", "oauth", ["email", "catalog"]),
  entry("g-maps", "Google Maps", "Google", "google", "Catálogo.", "api_key", ["maps", "catalog"]),
  // Microsoft
  entry("ms-365", "Microsoft 365", "Microsoft", "microsoft", "Catálogo.", "oauth", ["productivity", "catalog"]),
  entry("ms-azure", "Azure", "Microsoft", "microsoft", "Catálogo.", "oauth", ["cloud", "catalog"]),
  entry("ms-pbi", "Power BI", "Microsoft", "microsoft", "Catálogo.", "oauth", ["analytics", "catalog"]),
  // Webhook tech / protocolos / infra
  entry("tech-webhook", "Webhook", "Protocolo", "webhook_tech", "Catálogo técnico.", "webhook_secret", ["protocol", "catalog"]),
  entry("tech-rest", "REST", "Protocolo", "webhook_tech", "Catálogo técnico.", "protocol", ["protocol", "catalog"]),
  entry("tech-graphql", "GraphQL", "Protocolo", "webhook_tech", "Catálogo técnico.", "protocol", ["protocol", "catalog"]),
  entry("tech-grpc", "gRPC", "Protocolo", "webhook_tech", "Catálogo técnico.", "protocol", ["protocol", "catalog"]),
  entry("tech-kafka", "Kafka", "Apache", "webhook_tech", "Catálogo técnico.", "protocol", ["messaging", "catalog"]),
  entry("tech-rabbit", "RabbitMQ", "RabbitMQ", "webhook_tech", "Catálogo técnico.", "protocol", ["messaging", "catalog"]),
] as const;

export function marketplaceByCategory(
  category: MarketplaceCategory,
): MarketplaceEntry[] {
  return MARKETPLACE_CATALOG.filter((e) => e.category === category);
}

export function assertNoActiveMarketplace(): boolean {
  return MARKETPLACE_CATALOG.every((e) => e.active === false);
}

export function assertCatalogIntegrity(): {
  ok: boolean;
  size: number;
  uniqueIds: boolean;
  allInactive: boolean;
} {
  const ids = MARKETPLACE_CATALOG.map((e) => e.id);
  const uniqueIds = new Set(ids).size === ids.length;
  const allInactive = assertNoActiveMarketplace();
  return {
    ok: uniqueIds && allInactive && MARKETPLACE_CATALOG.length === 48,
    size: MARKETPLACE_CATALOG.length,
    uniqueIds,
    allInactive,
  };
}
