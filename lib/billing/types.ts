/**
 * Sprint 33.3 — domínio de billing SaaS (provider-agnostic).
 * Assinatura = TENANT. Entitlement ≠ RBAC.
 */

export const BILLING_SUBSCRIPTION_STATUSES = [
  "trial",
  "active",
  "past_due",
  "canceled",
] as const;

export type BillingSubscriptionStatus =
  (typeof BILLING_SUBSCRIPTION_STATUSES)[number];

export const BILLING_PROVIDERS = [
  "none",
  "stripe",
  "asaas",
  "mercadopago",
  "other",
] as const;

export type BillingProvider = (typeof BILLING_PROVIDERS)[number];

export type BillingPlanEntitlements = {
  modules?: string[];
  seats_max?: number | null;
  note?: string;
  [key: string]: unknown;
};

export type BillingPlan = {
  id: string;
  slug: string;
  name: string;
  status: "active" | "inactive" | "archived";
  amountCents: number | null;
  currency: string | null;
  billingInterval: "month" | "year" | null;
  entitlements: BillingPlanEntitlements;
  isPilot: boolean;
};

export type BillingSubscription = {
  id: string;
  tenantId: string;
  planId: string;
  status: BillingSubscriptionStatus;
  provider: string;
  providerCustomerId: string | null;
  providerSubscriptionId: string | null;
  trialStart: string | null;
  trialEnd: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BillingSubscriptionView = {
  subscription: BillingSubscription | null;
  plan: BillingPlan | null;
  trialExpired: boolean;
  accessMode: "open" | "entitled" | "restricted";
  restrictionReason: string | null;
};

export const PILOT_PLAN_SLUG = "pilot";

export const CORE_BILLING_MODULES = [
  "dashboard",
  "crm",
  "operacao",
  "estoque",
  "financeiro",
  "equipe",
  "configuracoes",
] as const;
