/**
 * Fluxo premium de primeiro acesso — só UX (Gate 19.4).
 * Mantém IDs de persistência; não altera o motor.
 */

import type { OnboardingStepId } from "@/lib/onboarding/onboarding-types";

export type PremiumOnboardingStepId =
  | "welcome"
  | "company"
  | "bank_account"
  | "first_sale";

/** Máximo 4 passos visíveis no wizard. */
export const PREMIUM_ONBOARDING_FLOW: readonly PremiumOnboardingStepId[] = [
  "welcome",
  "company",
  "bank_account",
  "first_sale",
] as const;

export function isPremiumFlowStep(id: OnboardingStepId): boolean {
  return (PREMIUM_ONBOARDING_FLOW as readonly string[]).includes(id);
}

/** Copy dos 4 passos (Gate 19.4). */
export const PREMIUM_STEP_COPY: Record<
  PremiumOnboardingStepId,
  { title: string; description: string }
> = {
  welcome: {
    title: "Bem-vindo ao Gestão.",
    description:
      "Controle, estratégia e resultados em um cockpit Enterprise.",
  },
  company: {
    title: "Cadastre sua empresa.",
    description: "Confirme a identidade do negócio no workspace.",
  },
  bank_account: {
    title: "Configure seu financeiro.",
    description: "Uma conta bancária libera a leitura financeira.",
  },
  first_sale: {
    title: "Comece pela primeira Ordem de Serviço.",
    description: "Registre a primeira OS ou venda para ativar o painel.",
  },
};
