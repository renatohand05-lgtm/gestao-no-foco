import {
  getCommercialPlan,
  isCommercialPlanSlug,
  type CommercialPlanSlug,
} from "./catalog.ts";

const RANK: Record<CommercialPlanSlug, number> = {
  start: 0,
  essential: 1,
  management: 2,
  pro: 3,
  pro_plus_consulting: 4,
};

export type PlanChangeKind = "upgrade" | "downgrade" | "same" | "invalid";

export type PlanChangeDecision = {
  kind: PlanChangeKind;
  from: string;
  to: string;
  allowed: boolean;
  /** Política financeira ainda não aprovada. */
  billingPolicy: "pending_commercial_decision";
  preferredTiming: "immediate" | "next_cycle" | "contact_sales" | "none";
  charges: false;
  deletesData: false;
  message: string;
};

export function classifyPlanChange(
  fromSlug: string,
  toSlug: string,
): PlanChangeDecision {
  const from = isCommercialPlanSlug(fromSlug) ? fromSlug : null;
  const to = isCommercialPlanSlug(toSlug) ? toSlug : null;
  if (!to || !getCommercialPlan(toSlug)) {
    return {
      kind: "invalid",
      from: fromSlug,
      to: toSlug,
      allowed: false,
      billingPolicy: "pending_commercial_decision",
      preferredTiming: "none",
      charges: false,
      deletesData: false,
      message: "Plano de destino inválido.",
    };
  }
  if (!from) {
    const dest = getCommercialPlan(toSlug);
    return {
      kind: "upgrade",
      from: fromSlug,
      to: toSlug,
      allowed: true,
      billingPolicy: "pending_commercial_decision",
      preferredTiming: dest?.requiresSalesContact ? "contact_sales" : "none",
      charges: false,
      deletesData: false,
      message:
        "Solicitação registrada sem cobrança e sem alterar o plano atual. Trial não inicia automaticamente. Política: PENDENTE DE DECISÃO COMERCIAL.",
    };
  }
  if (from === to) {
    return {
      kind: "same",
      from,
      to,
      allowed: false,
      billingPolicy: "pending_commercial_decision",
      preferredTiming: "none",
      charges: false,
      deletesData: false,
      message: "Já é o plano selecionado.",
    };
  }
  const upgrade = RANK[to] > RANK[from];
  const dest = getCommercialPlan(to);
  if (upgrade) {
    return {
      kind: "upgrade",
      from,
      to,
      allowed: true,
      billingPolicy: "pending_commercial_decision",
      preferredTiming: dest?.requiresSalesContact ? "contact_sales" : "immediate",
      charges: false,
      deletesData: false,
      message:
        "Upgrade registrado sem cobrança. Política imediato vs próximo ciclo: PENDENTE DE DECISÃO COMERCIAL.",
    };
  }
  return {
    kind: "downgrade",
    from,
    to,
    allowed: true,
    billingPolicy: "pending_commercial_decision",
    preferredTiming: "next_cycle",
    charges: false,
    deletesData: false,
    message:
      "Downgrade não apaga dados. Preferência técnica: próximo ciclo. Política financeira: PENDENTE DE DECISÃO COMERCIAL.",
  };
}
