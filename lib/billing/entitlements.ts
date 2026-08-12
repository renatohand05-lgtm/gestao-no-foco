import type {
  BillingPlanEntitlements,
  BillingSubscriptionStatus,
} from "./types.ts";
import { isBillingEnforcementEnabled } from "./config.ts";

/**
 * ENTITLEMENT (plano da empresa) ∩ RBAC (usuário) = acesso.
 * Este módulo só avalia entitlement / status da assinatura.
 */

export function parseEntitlements(raw: unknown): BillingPlanEntitlements {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as BillingPlanEntitlements;
}

export function planAllowsModule(
  entitlements: BillingPlanEntitlements,
  moduleKey: string,
): boolean {
  const modules = entitlements.modules;
  if (!Array.isArray(modules) || modules.length === 0) {
    // Sem lista = plano aberto (piloto sem restrição comercial ainda)
    return true;
  }
  return modules.includes(moduleKey);
}

export function isTrialExpired(input: {
  status: BillingSubscriptionStatus;
  trialEnd: string | null;
  now?: Date;
}): boolean {
  if (input.status !== "trial") return false;
  if (!input.trialEnd) return true; // trial sem fim = inválido (não infinito)
  const end = Date.parse(input.trialEnd);
  if (Number.isNaN(end)) return true;
  return (input.now ?? new Date()).getTime() > end;
}

/**
 * Política de restrição controlada — nunca apaga tenant/dados.
 * Com BILLING_ENFORCEMENT≠1: sempre open (não bloqueia piloto/teste).
 */
export function resolveSubscriptionAccess(input: {
  status: BillingSubscriptionStatus | null;
  trialEnd: string | null;
  entitlements: BillingPlanEntitlements;
  moduleKey?: string;
  now?: Date;
}): {
  accessMode: "open" | "entitled" | "restricted";
  reason: string | null;
  moduleAllowed: boolean;
} {
  if (!isBillingEnforcementEnabled()) {
    return { accessMode: "open", reason: null, moduleAllowed: true };
  }

  if (!input.status) {
    return {
      accessMode: "restricted",
      reason: "missing_subscription",
      moduleAllowed: false,
    };
  }

  if (input.status === "canceled") {
    return {
      accessMode: "restricted",
      reason: "canceled",
      moduleAllowed: false,
    };
  }

  if (input.status === "past_due") {
    // Restrição controlada: leitura básica ok via open parcial — módulos só se entitlement
    const moduleAllowed = input.moduleKey
      ? planAllowsModule(input.entitlements, input.moduleKey)
      : true;
    return {
      accessMode: "restricted",
      reason: "past_due",
      moduleAllowed,
    };
  }

  if (
    input.status === "trial" &&
    isTrialExpired({
      status: "trial",
      trialEnd: input.trialEnd,
      now: input.now,
    })
  ) {
    return {
      accessMode: "restricted",
      reason: "trial_expired",
      moduleAllowed: false,
    };
  }

  const moduleAllowed = input.moduleKey
    ? planAllowsModule(input.entitlements, input.moduleKey)
    : true;

  return {
    accessMode: moduleAllowed ? "entitled" : "restricted",
    reason: moduleAllowed ? null : "module_not_in_plan",
    moduleAllowed,
  };
}

/**
 * Acesso final = entitlement + RBAC (booleanos já resolvidos pelo caller).
 */
export function finalAccessAllowed(input: {
  entitlementAllowed: boolean;
  rbacAllowed: boolean;
}): boolean {
  return input.entitlementAllowed && input.rbacAllowed;
}
