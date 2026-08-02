/**
 * Sprint 30.1 — Nomenclatura e capacidades por segmento de tenant.
 * Sem imports de path alias — seguro para Next e testes Node.
 */

export type SegmentId =
  | "oficina"
  | "restaurante"
  | "comercio"
  | "consultoria"
  | "servicos"
  | "outro";

export type SegmentNavLabels = {
  team: string;
  teamDescription: string;
  workOrders: string;
  workOrdersDescription: string;
  opsCenterDescription: string;
  opsCenterTitle: string;
  showTeamNavItem: boolean;
  showWorkOrders: boolean;
};

const GENERIC: SegmentNavLabels = {
  team: "Equipe",
  teamDescription: "Equipe, custos e produtividade",
  workOrders: "Ordens",
  workOrdersDescription: "Ordens de trabalho e atendimento",
  opsCenterDescription: "Quadro ao vivo da operação",
  opsCenterTitle: "Centro de Operações",
  showTeamNavItem: true,
  showWorkOrders: true,
};

const BY_SEGMENT: Record<SegmentId, SegmentNavLabels> = {
  oficina: {
    team: "Mecânicos",
    teamDescription: "Equipe, custos e produtividade",
    workOrders: "Ordens de Serviço",
    workOrdersDescription: "Ordem de Trabalho · oficinas e prestadores",
    opsCenterDescription: "Quadro ao vivo da oficina",
    opsCenterTitle: "Centro de Operações",
    showTeamNavItem: true,
    showWorkOrders: true,
  },
  comercio: {
    team: "Equipe",
    teamDescription: "Colaboradores e produtividade",
    workOrders: "Pedidos / Atendimentos",
    workOrdersDescription: "Atendimentos e operações de loja",
    opsCenterDescription: "Quadro ao vivo da operação da loja",
    opsCenterTitle: "Centro de Operações",
    showTeamNavItem: false,
    showWorkOrders: true,
  },
  restaurante: {
    team: "Equipe",
    teamDescription: "Salão, cozinha e turnos",
    workOrders: "Pedidos",
    workOrdersDescription: "Pedidos e produção",
    opsCenterDescription: "Quadro ao vivo do salão e da produção",
    opsCenterTitle: "Centro de Operações",
    showTeamNavItem: false,
    showWorkOrders: true,
  },
  servicos: {
    team: "Profissionais",
    teamDescription: "Equipe técnica e agenda",
    workOrders: "Ordens de Trabalho",
    workOrdersDescription: "Ordens de trabalho e entregas",
    opsCenterDescription: "Quadro ao vivo dos atendimentos",
    opsCenterTitle: "Centro de Operações",
    showTeamNavItem: true,
    showWorkOrders: true,
  },
  consultoria: {
    team: "Consultores",
    teamDescription: "Consultores e capacidade",
    workOrders: "Projetos / Entregas",
    workOrdersDescription: "Projetos e entregáveis",
    opsCenterDescription: "Quadro ao vivo dos projetos",
    opsCenterTitle: "Centro de Operações",
    showTeamNavItem: true,
    showWorkOrders: true,
  },
  outro: { ...GENERIC },
};

export function resolveSegment(
  segment: string | null | undefined,
): SegmentId | null {
  if (!segment) return null;
  const s = segment.toLowerCase().trim();
  if (Object.prototype.hasOwnProperty.call(BY_SEGMENT, s)) {
    return s as SegmentId;
  }
  return null;
}

export function getSegmentNavLabels(
  segment: string | null | undefined,
): SegmentNavLabels {
  const resolved = resolveSegment(segment);
  if (!resolved) return GENERIC;
  return BY_SEGMENT[resolved];
}

export type OpsCenterCopy = {
  pageDescription: string;
  openOrdersLabel: string;
  assetsInOpsLabel: string;
  boardTitle: string;
  boardDescriptionCanEdit: string;
  boardDescriptionReadOnly: string;
  resourcesLinkLabel: string;
  showVehicleFields: boolean;
  assigneeLabel: string;
};

/** Sprint 30.2 — nomenclatura e presets de departamento/equipe por segmento. */
export type OrgTeamLabels = {
  departmentPresets: string[];
};

const ORG_TEAM_GENERIC: OrgTeamLabels = {
  departmentPresets: ["Administrativo", "Operações", "Comercial", "Financeiro"],
};

const ORG_TEAM_BY_SEGMENT: Record<SegmentId, OrgTeamLabels> = {
  oficina: {
    departmentPresets: [
      "Mecânica",
      "Recepção",
      "Peças",
      "Funilaria e Pintura",
      "Administrativo",
    ],
  },
  comercio: {
    departmentPresets: ["Vendas", "Caixa", "Estoque", "Administrativo", "Marketing"],
  },
  restaurante: {
    departmentPresets: ["Cozinha", "Salão", "Bar", "Delivery", "Administrativo"],
  },
  servicos: {
    departmentPresets: ["Atendimento", "Operações", "Comercial", "Administrativo"],
  },
  consultoria: {
    departmentPresets: ["Consultoria", "Comercial", "Financeiro", "Administrativo"],
  },
  outro: { ...ORG_TEAM_GENERIC },
};

export function getOrgTeamLabels(segment: string | null | undefined): OrgTeamLabels {
  const resolved = resolveSegment(segment);
  if (!resolved) return ORG_TEAM_GENERIC;
  return ORG_TEAM_BY_SEGMENT[resolved];
}

export function getOpsCenterCopy(
  segment: string | null | undefined,
): OpsCenterCopy {
  const resolved = resolveSegment(segment);
  if (resolved === "oficina") {
    return {
      pageDescription: "Visão rápida do que está acontecendo na oficina agora",
      openOrdersLabel: "OS abertas",
      assetsInOpsLabel: "Carros na oficina",
      boardTitle: "Quadro da operação",
      boardDescriptionCanEdit:
        "Arraste os cartões entre etapas quando a regra permitir. Clique para abrir a OS.",
      boardDescriptionReadOnly:
        "Clique no cartão para abrir a OS. Sem permissão para alterar status pelo quadro.",
      resourcesLinkLabel: "Elevadores / recursos",
      showVehicleFields: true,
      assigneeLabel: "Mecânico",
    };
  }
  if (resolved === "restaurante") {
    return {
      pageDescription: "Visão rápida do salão e da produção agora",
      openOrdersLabel: "Pedidos abertos",
      assetsInOpsLabel: "Em produção / salão",
      boardTitle: "Quadro da operação",
      boardDescriptionCanEdit:
        "Arraste os cartões entre etapas quando a regra permitir. Clique para abrir o pedido.",
      boardDescriptionReadOnly:
        "Clique no cartão para abrir. Sem permissão para alterar status pelo quadro.",
      resourcesLinkLabel: "Recursos / estações",
      showVehicleFields: false,
      assigneeLabel: "Responsável",
    };
  }
  if (resolved === "comercio") {
    return {
      pageDescription: "Visão rápida da operação da loja agora",
      openOrdersLabel: "Atendimentos abertos",
      assetsInOpsLabel: "Em operação",
      boardTitle: "Quadro da operação",
      boardDescriptionCanEdit:
        "Arraste os cartões entre etapas quando a regra permitir. Clique para abrir.",
      boardDescriptionReadOnly:
        "Clique no cartão para abrir. Sem permissão para alterar status pelo quadro.",
      resourcesLinkLabel: "Recursos",
      showVehicleFields: false,
      assigneeLabel: "Responsável",
    };
  }
  if (resolved === "consultoria") {
    return {
      pageDescription: "Visão rápida dos projetos e entregas agora",
      openOrdersLabel: "Entregas abertas",
      assetsInOpsLabel: "Em andamento",
      boardTitle: "Quadro da operação",
      boardDescriptionCanEdit:
        "Arraste os cartões entre etapas quando a regra permitir. Clique para abrir.",
      boardDescriptionReadOnly:
        "Clique no cartão para abrir. Sem permissão para alterar status pelo quadro.",
      resourcesLinkLabel: "Recursos",
      showVehicleFields: false,
      assigneeLabel: "Consultor",
    };
  }
  return {
    pageDescription: "Visão rápida do que está acontecendo na operação agora",
    openOrdersLabel: "Ordens abertas",
    assetsInOpsLabel: "Em operação",
    boardTitle: "Quadro da operação",
    boardDescriptionCanEdit:
      "Arraste os cartões entre etapas quando a regra permitir. Clique para abrir.",
    boardDescriptionReadOnly:
      "Clique no cartão para abrir. Sem permissão para alterar status pelo quadro.",
    resourcesLinkLabel: "Recursos",
    showVehicleFields: false,
    assigneeLabel: "Profissional",
  };
}
