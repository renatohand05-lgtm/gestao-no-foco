import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getPilotTrialDays } from "@/lib/billing/config";
import { parseEntitlements } from "@/lib/billing/entitlements";
import {
  PILOT_PLAN_SLUG,
  type BillingPlan,
  type BillingSubscription,
} from "@/lib/billing/types";
import type { Database, Json } from "@/types/database";

type Client = SupabaseClient<Database>;

function mapPlan(row: {
  id: string;
  slug: string;
  name: string;
  status: string;
  amount_cents: number | null;
  currency: string | null;
  billing_interval: string | null;
  entitlements: Json;
  is_pilot: boolean;
}): BillingPlan {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    status: row.status as BillingPlan["status"],
    amountCents: row.amount_cents,
    currency: row.currency,
    billingInterval: (row.billing_interval as BillingPlan["billingInterval"]) ?? null,
    entitlements: parseEntitlements(row.entitlements),
    isPilot: row.is_pilot,
  };
}

function mapSub(row: {
  id: string;
  tenant_id: string;
  plan_id: string;
  status: string;
  provider: string;
  provider_customer_id: string | null;
  provider_subscription_id: string | null;
  trial_start: string | null;
  trial_end: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}): BillingSubscription {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    planId: row.plan_id,
    status: row.status as BillingSubscription["status"],
    provider: row.provider,
    providerCustomerId: row.provider_customer_id,
    providerSubscriptionId: row.provider_subscription_id,
    trialStart: row.trial_start,
    trialEnd: row.trial_end,
    currentPeriodStart: row.current_period_start,
    currentPeriodEnd: row.current_period_end,
    cancelAtPeriodEnd: row.cancel_at_period_end,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getPlanBySlug(client: Client, slug: string) {
  const { data, error } = await client
    .from("billing_plans")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data ? mapPlan(data) : null;
}

export async function getSubscriptionForTenant(
  client: Client,
  tenantId: string,
) {
  const { data, error } = await client
    .from("billing_subscriptions")
    .select("*")
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapSub(data) : null;
}

export async function getSubscriptionWithPlan(
  client: Client,
  tenantId: string,
) {
  const sub = await getSubscriptionForTenant(client, tenantId);
  if (!sub) return { subscription: null, plan: null };
  const { data, error } = await client
    .from("billing_plans")
    .select("*")
    .eq("id", sub.planId)
    .maybeSingle();
  if (error) throw error;
  return { subscription: sub, plan: data ? mapPlan(data) : null };
}

export async function startPilotTrial(input: {
  client: Client;
  tenantId: string;
  now?: Date;
}) {
  const plan = await getPlanBySlug(input.client, PILOT_PLAN_SLUG);
  if (!plan) {
    return {
      ok: false as const,
      code: "PLAN_MISSING" as const,
      message: "Plano piloto não encontrado. Aplique a migration 33.3.",
    };
  }

  const existing = await getSubscriptionForTenant(
    input.client,
    input.tenantId,
  );
  if (existing && existing.status !== "canceled") {
    return {
      ok: false as const,
      code: "ALREADY_SUBSCRIBED" as const,
      message: "Este tenant já possui assinatura ativa ou em trial.",
      subscription: existing,
    };
  }

  const now = input.now ?? new Date();
  const trialEnd = new Date(now.getTime());
  trialEnd.setUTCDate(trialEnd.getUTCDate() + getPilotTrialDays());

  const payload = {
    tenant_id: input.tenantId,
    plan_id: plan.id,
    status: "trial" as const,
    provider: "none",
    provider_customer_id: null,
    provider_subscription_id: null,
    trial_start: now.toISOString(),
    trial_end: trialEnd.toISOString(),
    current_period_start: now.toISOString(),
    current_period_end: trialEnd.toISOString(),
    cancel_at_period_end: false,
    updated_at: now.toISOString(),
  };

  if (existing?.status === "canceled") {
    const { data, error } = await input.client
      .from("billing_subscriptions")
      .update(payload)
      .eq("tenant_id", input.tenantId)
      .select("*")
      .single();
    if (error) throw error;
    return { ok: true as const, subscription: mapSub(data), plan };
  }

  const { data, error } = await input.client
    .from("billing_subscriptions")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw error;
  return { ok: true as const, subscription: mapSub(data), plan };
}

export async function recordCheckoutAttempt(input: {
  client: Client;
  tenantId: string;
  idempotencyKey: string;
  planSlug: string;
  createdBy: string | null;
  provider: string;
}) {
  const { data: existing, error: readErr } = await input.client
    .from("billing_checkout_attempts")
    .select("*")
    .eq("tenant_id", input.tenantId)
    .eq("idempotency_key", input.idempotencyKey)
    .maybeSingle();
  if (readErr) throw readErr;
  if (existing) {
    return { attempt: existing, created: false };
  }

  const { data, error } = await input.client
    .from("billing_checkout_attempts")
    .insert({
      tenant_id: input.tenantId,
      idempotency_key: input.idempotencyKey,
      plan_slug: input.planSlug,
      status: "pending",
      provider: input.provider,
      created_by: input.createdBy,
      result_summary: {},
    })
    .select("*")
    .single();
  if (error) {
    // corrida: re-lê
    const { data: again } = await input.client
      .from("billing_checkout_attempts")
      .select("*")
      .eq("tenant_id", input.tenantId)
      .eq("idempotency_key", input.idempotencyKey)
      .maybeSingle();
    if (again) return { attempt: again, created: false };
    throw error;
  }
  return { attempt: data, created: true };
}

export async function updateCheckoutAttempt(
  client: Client,
  id: string,
  patch: {
    status: "provider_missing" | "ready" | "failed" | "completed";
    result_summary?: Json;
  },
) {
  const { error } = await client
    .from("billing_checkout_attempts")
    .update({
      status: patch.status,
      result_summary: patch.result_summary ?? {},
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}

export async function linkProviderSubscription(input: {
  client: Client;
  tenantId: string;
  providerCustomerId: string;
  providerSubscriptionId: string;
  /** Não promove para active — pagamento confirma via webhook. */
  keepStatus?: boolean;
  currentPeriodEnd?: string | null;
}) {
  const patch: {
    provider: string;
    provider_customer_id: string;
    provider_subscription_id: string;
    updated_at: string;
    current_period_end?: string;
  } = {
    provider: "asaas",
    provider_customer_id: input.providerCustomerId,
    provider_subscription_id: input.providerSubscriptionId,
    updated_at: new Date().toISOString(),
  };
  if (input.currentPeriodEnd) {
    patch.current_period_end = input.currentPeriodEnd;
  }
  const { data, error } = await input.client
    .from("billing_subscriptions")
    .update(patch)
    .eq("tenant_id", input.tenantId)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data ? mapSub(data) : null;
}

export async function markSubscriptionCanceled(input: {
  client: Client;
  tenantId: string;
  cancelAtPeriodEnd?: boolean;
}) {
  const { data, error } = await input.client
    .from("billing_subscriptions")
    .update({
      status: "canceled",
      cancel_at_period_end: input.cancelAtPeriodEnd ?? false,
      updated_at: new Date().toISOString(),
    })
    .eq("tenant_id", input.tenantId)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data ? mapSub(data) : null;
}

export async function getLatestCheckoutForTenant(
  client: Client,
  tenantId: string,
) {
  const { data, error } = await client
    .from("billing_checkout_attempts")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}
