import { isAsaasSandbox } from "./config.ts";
import { PILOT_PLAN_SLUG, type BillingPlan } from "./types.ts";

export type CheckoutAmountResult =
  | {
      ok: true;
      valueReais: number;
      amountCents: number;
      source: "plan" | "sandbox_homologation";
    }
  | { ok: false; code: string; message: string };

/**
 * Preço somente server-side. R$ 19,90 é homologação sandbox, não preço comercial.
 * Production exige amount_cents do plano — sem fallback.
 */
export function resolveCheckoutAmount(plan: BillingPlan): CheckoutAmountResult {
  if (plan.amountCents != null && plan.amountCents > 0) {
    return {
      ok: true,
      valueReais: plan.amountCents / 100,
      amountCents: plan.amountCents,
      source: "plan",
    };
  }

  if (!isAsaasSandbox()) {
    return {
      ok: false,
      code: "COMMERCIAL_PRICE_UNDEFINED",
      message:
        "Plano sem preço comercial definido. Cobrança real bloqueada até decisão humana de amount_cents.",
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
    source: "sandbox_homologation",
  };
}

/** Cliente não escolhe plano arbitrário — só o atual do tenant ou piloto. */
export function isPlanSlugAuthorized(input: {
  requestedSlug: string;
  tenantPlanSlug: string | null;
}): boolean {
  const requested = input.requestedSlug.trim();
  if (!requested) return false;
  if (requested === PILOT_PLAN_SLUG) return true;
  if (input.tenantPlanSlug && requested === input.tenantPlanSlug) return true;
  return false;
}

export function rejectClientPriceFields(input: Record<string, unknown>): string | null {
  for (const key of ["amount", "value", "amountCents", "price", "valor"]) {
    if (Object.prototype.hasOwnProperty.call(input, key) && input[key] != null) {
      return "Preço não pode ser enviado pelo cliente.";
    }
  }
  return null;
}
