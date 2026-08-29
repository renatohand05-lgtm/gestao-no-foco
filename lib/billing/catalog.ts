import { CORE_BILLING_MODULES } from "./types.ts";

export const COMMERCIAL_PLAN_SLUGS = [
  "essential",
  "management",
  "pro",
  "pro_plus_consulting",
] as const;

export type CommercialPlanSlug = (typeof COMMERCIAL_PLAN_SLUGS)[number];

export type CommercialPlan = {
  slug: CommercialPlanSlug;
  name: string;
  description: string;
  amountCents: number;
  currency: "BRL";
  billingInterval: "month";
  status: "active";
  displayOrder: number;
  recommended: boolean;
  /** Dias de trial comercial. null = sem trial automático. */
  trialDays: number | null;
  includesConsulting: boolean;
  requiresSalesContact: boolean;
  /** Total de logins incluídos no plano, contando o dono. */
  maxSeats: number;
  /** Mesmos módulos CORE — diferenças por plano = PENDENTE DE DECISÃO. */
  entitlements: {
    modules: readonly string[];
    includesConsulting: boolean;
    requiresSalesContact: boolean;
    trialDays: number | null;
    recommended: boolean;
    displayOrder: number;
    description: string;
    note: string;
  };
};

const CORE_NOTE =
  "Entitlements de módulo iguais ao CORE até decisão comercial. Não bloquear piloto.";

export const COMMERCIAL_CATALOG: readonly CommercialPlan[] = [
  {
    slug: "essential",
    name: "Essencial",
    description: "Plano SaaS mensal — funcionalidades por plano pendentes de decisão comercial.",
    amountCents: 27990,
    currency: "BRL",
    billingInterval: "month",
    status: "active",
    displayOrder: 1,
    recommended: false,
    trialDays: 14,
    maxSeats: 3,
    includesConsulting: false,
    requiresSalesContact: false,
    entitlements: {
      modules: CORE_BILLING_MODULES,
      includesConsulting: false,
      requiresSalesContact: false,
      trialDays: 14,
      recommended: false,
      displayOrder: 1,
      description: "Essencial",
      note: CORE_NOTE,
    },
  },
  {
    slug: "management",
    name: "Gestão",
    description: "Plano SaaS mensal recomendado — funcionalidades por plano pendentes de decisão comercial.",
    amountCents: 47990,
    currency: "BRL",
    billingInterval: "month",
    status: "active",
    displayOrder: 2,
    recommended: true,
    trialDays: 14,
    maxSeats: 6,
    includesConsulting: false,
    requiresSalesContact: false,
    entitlements: {
      modules: CORE_BILLING_MODULES,
      includesConsulting: false,
      requiresSalesContact: false,
      trialDays: 14,
      recommended: true,
      displayOrder: 2,
      description: "Gestão",
      note: CORE_NOTE,
    },
  },
  {
    slug: "pro",
    name: "Pro",
    description: "Plano SaaS mensal — funcionalidades por plano pendentes de decisão comercial.",
    amountCents: 74990,
    currency: "BRL",
    billingInterval: "month",
    status: "active",
    displayOrder: 3,
    recommended: false,
    trialDays: 14,
    maxSeats: 16,
    includesConsulting: false,
    requiresSalesContact: false,
    entitlements: {
      modules: CORE_BILLING_MODULES,
      includesConsulting: false,
      requiresSalesContact: false,
      trialDays: 14,
      recommended: false,
      displayOrder: 3,
      description: "Pro",
      note: CORE_NOTE,
    },
  },
  {
    slug: "pro_plus_consulting",
    name: "Pro Plus + Consultoria",
    description:
      "Plano com componente de serviço/consultoria humana. Sem trial automático; exige contato comercial.",
    amountCents: 349990,
    currency: "BRL",
    billingInterval: "month",
    status: "active",
    displayOrder: 4,
    recommended: false,
    trialDays: null,
    maxSeats: 21,
    includesConsulting: true,
    requiresSalesContact: true,
    entitlements: {
      modules: CORE_BILLING_MODULES,
      includesConsulting: true,
      requiresSalesContact: true,
      trialDays: null,
      recommended: false,
      displayOrder: 4,
      description: "Pro Plus + Consultoria",
      note: "Consultoria não é automatizada nesta sprint. " + CORE_NOTE,
    },
  },
] as const;

export function isCommercialPlanSlug(slug: string): slug is CommercialPlanSlug {
  return (COMMERCIAL_PLAN_SLUGS as readonly string[]).includes(slug);
}

export function getCommercialPlan(slug: string): CommercialPlan | null {
  return COMMERCIAL_CATALOG.find((p) => p.slug === slug) ?? null;
}

export function listCommercialPlans(): readonly CommercialPlan[] {
  return COMMERCIAL_CATALOG;
}

export function getRecommendedPlan(): CommercialPlan {
  const found = COMMERCIAL_CATALOG.find((p) => p.recommended);
  if (!found) throw new Error("Catálogo sem plano recomendado");
  return found;
}

export function getCommercialTrialDays(slug: string): number | null {
  return getCommercialPlan(slug)?.trialDays ?? null;
}

/**
 * Vagas de login (dono + equipe) do plano. Piloto/sem plano comercial = 3
 * (mesmo teto do Essencial), pra não travar tenants ainda sem plano definido.
 */
export function getMaxSeatsForPlanSlug(slug: string | null | undefined): number {
  if (!slug) return 3;
  return getCommercialPlan(slug)?.maxSeats ?? 3;
}

/** Preço confiável — nunca aceitar amount do cliente. */
export function resolveTrustedAmountCents(slug: string): number | null {
  return getCommercialPlan(slug)?.amountCents ?? null;
}

export function formatBrlFromCents(amountCents: number): string {
  return (amountCents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/** SANDBOX homologação — nunca tratar como preço comercial. */
export const SANDBOX_HOMOLOGATION_AMOUNT_CENTS = 1990;
