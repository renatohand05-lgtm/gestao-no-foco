/**
 * Sprint 30.4 — Configuração de apresentação do Executive Cockpit V2.
 * Sem path alias — seguro para testes Node. Não contém fórmulas financeiras.
 */

export type CockpitSegmentId =
  | "oficina"
  | "restaurante"
  | "comercio"
  | "consultoria"
  | "servicos"
  | "outro";

export type QuickActionId =
  | "venda"
  | "os"
  | "cliente"
  | "conta"
  | "orcamento"
  | "compra"
  | "produto"
  | "servico"
  | "membro"
  | "importar";

export type QuickActionDef = {
  id: QuickActionId;
  label: string;
  description: string;
  hrefSuffix: string;
  shortcut?: string;
};

export type AlertPriority = "critica" | "alta" | "media" | "baixa";
export type AlertCategory =
  | "financeiro"
  | "compras"
  | "estoque"
  | "crm"
  | "equipe"
  | "operacao"
  | "tributario";

export type SegmentCockpitCopy = {
  workOrderLabel: string;
  workOrderShort: string;
  catalogLabel: string;
  teamLabel: string;
  kpiOrdersTitle: string;
  primaryActionId: QuickActionId;
  emptySalesTitle: string;
  emptySalesBody: string;
};

const GENERIC_COPY: SegmentCockpitCopy = {
  workOrderLabel: "Ordens",
  workOrderShort: "Ordens",
  catalogLabel: "Catálogo",
  teamLabel: "Equipe",
  kpiOrdersTitle: "Ordens abertas",
  primaryActionId: "venda",
  emptySalesTitle: "Você ainda não possui vendas",
  emptySalesBody: "Cadastre sua primeira venda para ativar o cockpit.",
};

const COPY: Record<CockpitSegmentId, SegmentCockpitCopy> = {
  oficina: {
    ...GENERIC_COPY,
    workOrderLabel: "Ordens de Serviço",
    workOrderShort: "OS",
    catalogLabel: "Peças e serviços",
    teamLabel: "Mecânicos",
    kpiOrdersTitle: "OS abertas",
    primaryActionId: "os",
    emptySalesTitle: "Você ainda não registrou vendas ou OS faturadas",
    emptySalesBody: "Crie a primeira Ordem de Serviço para ver o movimento.",
  },
  comercio: {
    ...GENERIC_COPY,
    workOrderLabel: "Pedidos",
    workOrderShort: "Pedidos",
    catalogLabel: "Produtos",
    teamLabel: "Equipe",
    kpiOrdersTitle: "Pedidos em aberto",
    primaryActionId: "venda",
  },
  restaurante: {
    ...GENERIC_COPY,
    workOrderLabel: "Pedidos",
    workOrderShort: "Pedidos",
    catalogLabel: "Cardápio",
    teamLabel: "Equipe",
    kpiOrdersTitle: "Pedidos abertos",
    primaryActionId: "venda",
    emptySalesBody: "Registre o primeiro pedido para acompanhar o salão e o caixa.",
  },
  servicos: {
    ...GENERIC_COPY,
    workOrderLabel: "Ordens de Trabalho",
    workOrderShort: "Ordens",
    catalogLabel: "Serviços",
    teamLabel: "Profissionais",
    kpiOrdersTitle: "Ordens abertas",
    primaryActionId: "os",
  },
  consultoria: {
    ...GENERIC_COPY,
    workOrderLabel: "Projetos / Entregas",
    workOrderShort: "Projetos",
    catalogLabel: "Serviços",
    teamLabel: "Consultores",
    kpiOrdersTitle: "Projetos abertos",
    primaryActionId: "cliente",
    emptySalesTitle: "Você ainda não possui faturamento no período",
    emptySalesBody: "Cadastre clientes e registre a primeira entrega.",
  },
  outro: GENERIC_COPY,
};

/** Ações rápidas — hrefs reais; ordem personalizável por segmento. */
export const QUICK_ACTIONS_CATALOG: readonly QuickActionDef[] = [
  {
    id: "venda",
    label: "Nova venda",
    description: "Registrar venda",
    hrefSuffix: "/vendas/nova",
    shortcut: "V",
  },
  {
    id: "os",
    label: "Nova OS",
    description: "Abrir ordem de serviço",
    hrefSuffix: "/ordens/nova",
    shortcut: "O",
  },
  {
    id: "cliente",
    label: "Novo cliente",
    description: "Cadastrar cliente",
    hrefSuffix: "/clientes/novo",
    shortcut: "C",
  },
  {
    id: "conta",
    label: "Nova conta",
    description: "Conta bancária",
    hrefSuffix: "/financeiro/contas-bancarias/novo",
    shortcut: "B",
  },
  {
    id: "orcamento",
    label: "Novo orçamento",
    description: "Orçamento financeiro",
    hrefSuffix: "/financeiro/orcamento/novo",
  },
  {
    id: "compra",
    label: "Nova compra",
    description: "Pedido de compra",
    hrefSuffix: "/compras/pedidos",
  },
  {
    id: "produto",
    label: "Novo produto",
    description: "Incluir no catálogo",
    hrefSuffix: "/produtos/novo",
    shortcut: "P",
  },
  {
    id: "servico",
    label: "Novo serviço",
    description: "Cadastrar serviço",
    hrefSuffix: "/produtos/servicos",
  },
  {
    id: "membro",
    label: "Novo membro",
    description: "Convidar colaborador",
    hrefSuffix: "/configuracoes/equipe?tab=convites",
  },
  {
    id: "importar",
    label: "Importar dados",
    description: "Área de importação",
    hrefSuffix: "/produtos/importar",
  },
] as const;

const ACTION_ORDER: Record<CockpitSegmentId, QuickActionId[]> = {
  oficina: [
    "os",
    "venda",
    "cliente",
    "produto",
    "servico",
    "membro",
    "conta",
    "compra",
    "importar",
    "orcamento",
  ],
  comercio: [
    "venda",
    "produto",
    "cliente",
    "compra",
    "conta",
    "membro",
    "importar",
    "orcamento",
    "servico",
    "os",
  ],
  restaurante: [
    "venda",
    "produto",
    "cliente",
    "compra",
    "conta",
    "membro",
    "importar",
    "servico",
    "orcamento",
    "os",
  ],
  servicos: [
    "os",
    "servico",
    "cliente",
    "venda",
    "membro",
    "conta",
    "importar",
    "produto",
    "orcamento",
    "compra",
  ],
  consultoria: [
    "cliente",
    "servico",
    "venda",
    "membro",
    "conta",
    "orcamento",
    "importar",
    "produto",
    "os",
    "compra",
  ],
  outro: [
    "venda",
    "cliente",
    "produto",
    "servico",
    "os",
    "conta",
    "membro",
    "compra",
    "importar",
    "orcamento",
  ],
};

export function resolveCockpitSegment(
  segment: string | null | undefined,
): CockpitSegmentId {
  if (
    segment === "oficina" ||
    segment === "restaurante" ||
    segment === "comercio" ||
    segment === "consultoria" ||
    segment === "servicos"
  ) {
    return segment;
  }
  // aliases enterprise 30.3 → nav
  if (segment === "auto_center" || segment === "lava_rapido") return "oficina";
  if (segment === "distribuicao" || segment === "pequena_industria") {
    return "comercio";
  }
  return "outro";
}

export function getSegmentCockpitCopy(
  segment: string | null | undefined,
): SegmentCockpitCopy {
  return COPY[resolveCockpitSegment(segment)];
}

export function getSegmentQuickActions(
  segment: string | null | undefined,
): QuickActionDef[] {
  const id = resolveCockpitSegment(segment);
  const order = ACTION_ORDER[id];
  const byId = Object.fromEntries(
    QUICK_ACTIONS_CATALOG.map((a) => [a.id, a]),
  ) as Record<QuickActionId, QuickActionDef>;
  return order.map((actionId) => {
    const base = byId[actionId];
    if (actionId === "os") {
      const copy = COPY[id];
      return {
        ...base,
        label: `Nova ${copy.workOrderShort}`,
        description: `Abrir ${copy.workOrderLabel.toLowerCase()}`,
      };
    }
    return base;
  });
}

export const ALERT_PRIORITY_ORDER: readonly AlertPriority[] = [
  "critica",
  "alta",
  "media",
  "baixa",
] as const;

export const ALERT_CATEGORIES: readonly AlertCategory[] = [
  "financeiro",
  "compras",
  "estoque",
  "crm",
  "equipe",
  "operacao",
  "tributario",
] as const;
