/**
 * Validação de etapas do onboarding (Sprint 13.12).
 * Mensagens em português · sem I/O.
 */

import type { OnboardingStepId } from "@/lib/onboarding/onboarding-types";

export type OnboardingValidationResult =
  | { ok: true }
  | { ok: false; message: string };

export function validateStepNavigation(input: {
  step: OnboardingStepId;
  skip?: boolean;
}): OnboardingValidationResult {
  if (!input.step) {
    return { ok: false, message: "Etapa inválida." };
  }
  return { ok: true };
}

export function humanizeOnboardingError(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("jwt") || msg.includes("session") || msg.includes("auth")) {
      return "Sua sessão expirou. Faça login novamente.";
    }
    if (msg.includes("network") || msg.includes("fetch")) {
      return "Sem conexão. Verifique a internet e tente de novo.";
    }
    if (msg.includes("duplicate") || msg.includes("23505")) {
      return "Esse registro já existe. Ajuste os dados e tente novamente.";
    }
    return error.message || "Não foi possível salvar. Tente novamente.";
  }
  return "Não foi possível salvar. Tente novamente.";
}

export function progressCorruptedMessage() {
  return "O progresso parece inconsistente. Você pode continuar pelo checklist — os itens usam dados reais.";
}
