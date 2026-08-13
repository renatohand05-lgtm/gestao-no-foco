import {
  getCommercialPlan,
  isCommercialPlanSlug,
} from "./catalog.ts";
import { isAsaasSandbox } from "./config.ts";
import { PILOT_PLAN_SLUG, type BillingPlan } from "./types.ts";

export type CheckoutAmountResult =
  | {
      ok: true;
      valueReais: number;
      amountCents: number;
      currency: "BRL";
      source: "plan" | "catalog" | "sandbox_homologation";
    }
  | { ok: false; code: string; message: string };

/**
 * Preço somente server-side.
 * R$ 19,90 = homologação sandbox do plano piloto — NÃO é preço comercial.
 * Planos do catálogo: amount_cents do catálogo (não do cliente).
 */
export function resolveCheckoutAmount(plan: BillingPlan): CheckoutAmountResult {
  if (plan.status === "inactive" || plan.status === "archived") {
    return {
      ok: false,
      code: "PLAN_INACTIVE",
      message: "Plano inativo ou arquivado.",
    };
  }

  const commercial = getCommercialPlan(plan.slug);
  if (commercial) {
    return {
      ok: true,
      valueReais: commercial.amountCents / 100,
      amountCents: commercial.amountCents,
      currency: "BRL",
      source: "catalog",
    };
  }

  if (plan.amountCents != null && plan.amountCents > 0) {
    return {
      ok: true,
      valueReais: plan.amountCents / 100,
      amountCents: plan.amountCents,
      currency: "BRL",
      source: "plan",
    };
  }

  if (!isAsaasSandbox()) {
    return {
      ok: false,
      code: "COMMERCIAL_PRICE_UNDEFINED",
      message:
        "Plano sem preço comercial definido. Cobrança real bloqueada até amount_cents.",
    };
  }

  const raw = Number(process.env.BILLING_SANDBOX_AMOUNT || "19.9");
  if (!Number.isFinite(raw) || raw <= 0) {
    return {
      ok: false,
      code: "SANDBOX_AMOUNT_INVALID",
      message: "BILLING_SANDBOX_AMOUNT inválido.",
    };
  }

  return {
    ok: true,
    valueReais: raw,
    amountCents: Math.round(raw * 100),
    currency: "BRL",
    source: "sandbox_homologation",
  };
}

export function isPlanSlugAuthorized(input: {
  requestedSlug: string;
  tenantPlanSlug: string | null;
}): boolean {
  const requested = input.requestedSlug.trim();
  if (!requested) return false;
  if (requested === PILOT_PLAN_SLUG) return true;
  if (input.tenantPlanSlug && requested === input.tenantPlanSlug) return true;
  if (isCommercialPlanSlug(requested)) {
    const plan = getCommercialPlan(requested);
    return plan?.status === "active";
  }
  return false;
}

export function rejectClientPriceFields(input: Record<string, unknown>): string | null {
  for (const key of [
    "amount",
    "value",
    "amountCents",
    "amount_cents",
    "price",
    "valor",
    "currency",
    "moeda",
  ]) {
    if (Object.prototype.hasOwnProperty.call(input, key) && input[key] != null) {
      return "Preço/moeda não podem ser enviados pelo cliente.";
    }
  }
  return null;
}

/** Catálogo server-side vence qualquer payload de preço do cliente. */
export function resolveAmountIgnoringClient(
  plan: BillingPlan,
  clientPayload: Record<string, unknown>,
): CheckoutAmountResult {
  const rejected = rejectClientPriceFields(clientPayload);
  if (rejected) {
    return {
      ok: false,
      code: "PRICE_NOT_CLIENT_SETTABLE",
      message: rejected,
    };
  }
  return resolveCheckoutAmount(plan);
}
