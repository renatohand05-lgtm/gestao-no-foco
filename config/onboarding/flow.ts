/**
 * Sprint 30.3 — Fluxo enterprise do wizard (config).
 * Tempo médio estimado: ~6 minutos.
 */

export type EnterpriseOnboardingStepId =
  | "welcome"
  | "segment"
  | "company"
  | "segment_setup"
  | "templates"
  | "checklist"
  | "import_prep"
  | "complete";

export type EnterpriseFlowStep = {
  id: EnterpriseOnboardingStepId;
  title: string;
  description: string;
  estimatedMinutes: number;
};

export const ENTERPRISE_ONBOARDING_FLOW: readonly EnterpriseFlowStep[] = [
  {
    id: "welcome",
    title: "Bem-vindo",
    description: "Vamos configurar sua empresa em poucos minutos.",
    estimatedMinutes: 0.5,
  },
  {
    id: "segment",
    title: "Segmento",
    description: "Escolha o tipo de negócio para personalizar menus e cadastros.",
    estimatedMinutes: 1,
  },
  {
    id: "company",
    title: "Dados da empresa",
    description: "Preencha o que souber — nenhum campo é obrigatório além do nome.",
    estimatedMinutes: 1.5,
  },
  {
    id: "segment_setup",
    title: "Configuração do segmento",
    description: "Labels, módulos, KPIs e fluxos aplicados automaticamente.",
    estimatedMinutes: 1,
  },
  {
    id: "templates",
    title: "Templates iniciais",
    description: "Estruturas sugeridas — sem inserir dados reais.",
    estimatedMinutes: 0.5,
  },
  {
    id: "checklist",
    title: "Checklist de implantação",
    description: "Acompanhe o progresso da implantação.",
    estimatedMinutes: 0.5,
  },
  {
    id: "import_prep",
    title: "Importação",
    description: "Arquitetura preparada para Excel, CSV, PDF, ERP e API.",
    estimatedMinutes: 0.5,
  },
  {
    id: "complete",
    title: "Pronto",
    description: "Parabéns! Sua empresa está pronta.",
    estimatedMinutes: 0.5,
  },
] as const;

export const ENTERPRISE_AVG_MINUTES = 6;

export function enterpriseStepIndex(
  id: EnterpriseOnboardingStepId,
): number {
  return ENTERPRISE_ONBOARDING_FLOW.findIndex((s) => s.id === id);
}

export function nextEnterpriseStep(
  id: EnterpriseOnboardingStepId,
): EnterpriseOnboardingStepId | null {
  const i = enterpriseStepIndex(id);
  if (i < 0 || i >= ENTERPRISE_ONBOARDING_FLOW.length - 1) return null;
  return ENTERPRISE_ONBOARDING_FLOW[i + 1]!.id;
}

export function prevEnterpriseStep(
  id: EnterpriseOnboardingStepId,
): EnterpriseOnboardingStepId | null {
  const i = enterpriseStepIndex(id);
  if (i <= 0) return null;
  return ENTERPRISE_ONBOARDING_FLOW[i - 1]!.id;
}

export function enterpriseProgressPct(
  id: EnterpriseOnboardingStepId,
): number {
  const i = enterpriseStepIndex(id);
  if (i < 0) return 0;
  return Math.round(((i + 1) / ENTERPRISE_ONBOARDING_FLOW.length) * 100);
}
