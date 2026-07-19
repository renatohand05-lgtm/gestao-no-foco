import type {
  OnboardingStepDefinition,
  OnboardingStepId,
} from "@/lib/onboarding/onboarding-types";
import type { TenantSegment } from "@/types";

export const ONBOARDING_STEPS: OnboardingStepDefinition[] = [
  {
    id: "welcome",
    title: "Boas-vindas",
    description: "Entenda o que o Gestão no Foco entrega em poucos minutos.",
    required: true,
    estimatedMinutes: 1,
  },
  {
    id: "company",
    title: "Dados da empresa",
    description: "Nome e identificação do negócio no sistema.",
    required: true,
    estimatedMinutes: 2,
    dataBacked: true,
    checklistId: "empresa",
  },
  {
    id: "segment",
    title: "Segmento",
    description: "Ajuda a priorizar textos e o checklist inicial.",
    required: true,
    estimatedMinutes: 1,
    dataBacked: true,
    checklistId: "segmento",
  },
  {
    id: "bank_account",
    title: "Conta bancária",
    description: "Base para o financeiro e o Dashboard.",
    required: false,
    estimatedMinutes: 3,
    dataBacked: true,
    checklistId: "conta_bancaria",
    hrefSuffix: "/financeiro/contas-bancarias/novo",
  },
  {
    id: "monthly_goal",
    title: "Meta mensal",
    description: "Ativa Score, gap e projeção no Dashboard.",
    required: false,
    estimatedMinutes: 3,
    dataBacked: true,
    checklistId: "meta_mensal",
    hrefSuffix: "/configuracoes/metas/nova",
  },
  {
    id: "first_client",
    title: "Primeiro cliente",
    description: "Necessário para registrar vendas com contexto.",
    required: false,
    estimatedMinutes: 2,
    dataBacked: true,
    checklistId: "cliente",
    hrefSuffix: "/clientes/novo",
  },
  {
    id: "first_product",
    title: "Produto ou serviço",
    description: "Itens do catálogo para a primeira venda.",
    required: false,
    estimatedMinutes: 2,
    dataBacked: true,
    checklistId: "produto",
    hrefSuffix: "/produtos/novo",
  },
  {
    id: "first_sale",
    title: "Primeira venda",
    description: "Gera o primeiro movimento útil no Dashboard.",
    required: false,
    estimatedMinutes: 4,
    dataBacked: true,
    checklistId: "venda",
    hrefSuffix: "/vendas/nova",
  },
  {
    id: "review",
    title: "Revisão",
    description: "Confira o progresso e o que já desbloqueou.",
    required: true,
    estimatedMinutes: 1,
  },
  {
    id: "dashboard",
    title: "Dashboard",
    description: "Acesse o cockpit executivo com o que já estiver pronto.",
    required: true,
    estimatedMinutes: 1,
    hrefSuffix: "/dashboard",
  },
];

export function getStepDefinition(
  id: OnboardingStepId,
): OnboardingStepDefinition | undefined {
  return ONBOARDING_STEPS.find((s) => s.id === id);
}

export function orderedStepIds(): OnboardingStepId[] {
  return ONBOARDING_STEPS.map((s) => s.id);
}

/** Textos e ordem sugerida por segmento do tenant (sem mudar motores). */
export function segmentCopy(segment: TenantSegment | string | null): {
  welcomeLead: string;
  firstValueHint: string;
} {
  switch (segment) {
    case "oficina":
      return {
        welcomeLead:
          "Organize OS, peças e faturamento em um cockpit simples.",
        firstValueHint: "Cadastre meta e a primeira venda faturada.",
      };
    case "restaurante":
      return {
        welcomeLead:
          "Acompanhe vendas, custos e ritmo do mês em um só lugar.",
        firstValueHint: "Defina a meta mensal e registre o primeiro movimento.",
      };
    case "consultoria":
      return {
        welcomeLead:
          "Tenha visão executiva de receita, metas e prioridades.",
        firstValueHint: "Configure meta e o primeiro cliente/projeto vendido.",
      };
    case "comercio":
      return {
        welcomeLead:
          "Metas, vendas e financeiro juntos para decidir com clareza.",
        firstValueHint: "Meta + primeira venda liberam o Dashboard útil.",
      };
    case "servicos":
      return {
        welcomeLead:
          "Veja ritmo de serviço, meta e receita sem planilha paralela.",
        firstValueHint: "Meta mensal ou primeira venda já ativam o Dashboard.",
      };
    default:
      return {
        welcomeLead:
          "Ative indicadores reais em poucos passos — sem cadastro interminável.",
        firstValueHint:
          "Com meta ou venda você já vê valor no Dashboard.",
      };
  }
}

/**
 * Textos de persona (CEO, Financeiro, etc.) — só copy/ordem sugerida.
 * Não cria módulos novos nem altera motores.
 */
export function personaCopy(presetKey: string | null | undefined): {
  label: string;
  focus: string;
} {
  switch (presetKey) {
    case "ceo":
      return {
        label: "CEO",
        focus: "Priorize meta e visão consolidada do mês.",
      };
    case "financeiro":
      return {
        label: "Financeiro",
        focus: "Comece pela conta bancária e depois a meta.",
      };
    case "comercial":
      return {
        label: "Comercial",
        focus: "Cliente, produto e primeira venda primeiro.",
      };
    case "operacional":
      return {
        label: "Operacional",
        focus: "Produto/serviço e movimento comercial iniciais.",
      };
    case "rh":
      return {
        label: "RH",
        focus: "Configure a empresa e acompanhe o Dashboard geral.",
      };
    case "oficina":
      return {
        label: "Oficina",
        focus: "Meta e primeira venda faturada.",
      };
    case "restaurante":
      return {
        label: "Restaurante",
        focus: "Meta do mês e primeiro movimento de venda.",
      };
    case "consultoria":
      return {
        label: "Consultoria",
        focus: "Cliente + meta liberam o primeiro valor.",
      };
    default:
      return {
        label: "Geral",
        focus: "Meta ou venda para ativar o Dashboard.",
      };
  }
}

/** Preset de layout sugerido (só indicação — Layout Engine inalterado). */
export function suggestedPresetForSegment(
  segment: TenantSegment | string | null,
): string {
  switch (segment) {
    case "oficina":
      return "oficina";
    case "restaurante":
      return "restaurante";
    case "consultoria":
      return "consultoria";
    case "comercio":
      return "comercial";
    default:
      return "ceo";
  }
}
