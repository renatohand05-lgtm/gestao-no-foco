/** Ciclo oficial da OS — Sprint 13.19 */

export const OS_STATUS = [
  "rascunho",
  "aguardando_diagnostico",
  "diagnostico_concluido",
  "aguardando_orcamento",
  "aguardando_aprovacao",
  "aprovado",
  "parcialmente_aprovado",
  "em_execucao",
  "aguardando_peca",
  "aguardando_cliente",
  "pronto_para_entrega",
  "entregue",
  "faturado",
  "cancelado",
  "retorno",
  "garantia",
] as const;

export type OsStatus = (typeof OS_STATUS)[number];

export const OS_STATUS_LABELS: Record<OsStatus, string> = {
  rascunho: "Rascunho",
  aguardando_diagnostico: "Aguardando diagnóstico",
  diagnostico_concluido: "Diagnóstico concluído",
  aguardando_orcamento: "Aguardando orçamento",
  aguardando_aprovacao: "Aguardando aprovação",
  aprovado: "Aprovado",
  parcialmente_aprovado: "Parcialmente aprovado",
  em_execucao: "Em execução",
  aguardando_peca: "Aguardando peça",
  aguardando_cliente: "Aguardando cliente",
  pronto_para_entrega: "Pronto para entrega",
  entregue: "Entregue",
  faturado: "Faturado",
  cancelado: "Cancelado",
  retorno: "Retorno",
  garantia: "Garantia",
};

/** Transições válidas (destino permitido a partir de origem). */
export const OS_TRANSITIONS: Record<OsStatus, OsStatus[]> = {
  rascunho: ["aguardando_diagnostico", "aguardando_orcamento", "cancelado"],
  aguardando_diagnostico: [
    "diagnostico_concluido",
    "aguardando_orcamento",
    "aguardando_aprovacao",
    "cancelado",
  ],
  diagnostico_concluido: ["aguardando_orcamento", "aguardando_aprovacao", "cancelado"],
  aguardando_orcamento: ["aguardando_aprovacao", "cancelado"],
  aguardando_aprovacao: [
    "aprovado",
    "parcialmente_aprovado",
    "aguardando_orcamento",
    "cancelado",
  ],
  aprovado: ["em_execucao", "aguardando_peca", "cancelado"],
  parcialmente_aprovado: ["em_execucao", "aguardando_peca", "aguardando_orcamento", "cancelado"],
  em_execucao: [
    "aguardando_peca",
    "aguardando_cliente",
    "pronto_para_entrega",
    "cancelado",
  ],
  aguardando_peca: ["em_execucao", "aguardando_cliente", "cancelado"],
  aguardando_cliente: ["em_execucao", "pronto_para_entrega", "cancelado"],
  pronto_para_entrega: ["entregue", "em_execucao"],
  entregue: ["faturado", "retorno", "garantia"],
  faturado: ["retorno", "garantia"],
  cancelado: [],
  retorno: ["em_execucao", "pronto_para_entrega", "entregue", "faturado", "cancelado"],
  garantia: ["em_execucao", "pronto_para_entrega", "entregue", "cancelado"],
};

export function canTransition(from: string, to: string): boolean {
  if (from === to) return true;
  const allowed = OS_TRANSITIONS[from as OsStatus];
  if (!allowed) return false;
  return allowed.includes(to as OsStatus);
}

export function assertTransition(from: string, to: string): void {
  if (!canTransition(from, to)) {
    throw new Error(
      `Transição inválida: ${OS_STATUS_LABELS[from as OsStatus] ?? from} → ${OS_STATUS_LABELS[to as OsStatus] ?? to}.`,
    );
  }
}

/**
 * Pipeline operacional típico (sem laterais como aguardando_peca).
 * Usado para guards de UI e avanço por domínio sem saltos.
 */
export const OS_PIPELINE: OsStatus[] = [
  "rascunho",
  "aguardando_diagnostico",
  "diagnostico_concluido",
  "aguardando_orcamento",
  "aguardando_aprovacao",
  "aprovado",
  "em_execucao",
  "pronto_para_entrega",
  "entregue",
  "faturado",
];

/** Menor caminho de transições adjacentes válidas (sem saltos). */
export function findTransitionPath(
  from: string,
  to: string,
): OsStatus[] | null {
  if (from === to) return [];
  if (!(from in OS_TRANSITIONS) || !(to in OS_TRANSITIONS)) return null;

  const queue: OsStatus[][] = [[from as OsStatus]];
  const visited = new Set<string>([from]);

  while (queue.length > 0) {
    const path = queue.shift()!;
    const current = path[path.length - 1]!;
    for (const next of OS_TRANSITIONS[current] ?? []) {
      if (visited.has(next)) continue;
      const nextPath = [...path, next];
      if (next === to) return nextPath.slice(1);
      visited.add(next);
      queue.push(nextPath);
    }
  }

  return null;
}

export function pipelineIndex(status: string): number {
  if (status === "parcialmente_aprovado") {
    return OS_PIPELINE.indexOf("aprovado");
  }
  return OS_PIPELINE.indexOf(status as OsStatus);
}

export function isBeforePipeline(status: string, target: string): boolean {
  const from = pipelineIndex(status);
  const to = pipelineIndex(target);
  if (from < 0 || to < 0) return false;
  return from < to;
}

export function canRegisterDiagnostico(status: string): boolean {
  return (
    isBeforePipeline(status, "diagnostico_concluido") ||
    status === "diagnostico_concluido" ||
    status === "aguardando_orcamento" ||
    status === "aguardando_aprovacao"
  );
}

export function canEditOrcamento(
  status: string,
  requireDiagnosis = true,
): boolean {
  const afterDiagnosis = [
    "diagnostico_concluido",
    "aguardando_orcamento",
    "aguardando_aprovacao",
    "parcialmente_aprovado",
  ];
  if (!requireDiagnosis) {
    return [
      "rascunho",
      "aguardando_diagnostico",
      ...afterDiagnosis,
    ].includes(status);
  }
  return afterDiagnosis.includes(status);
}

export function canApplyAprovacao(
  status: string,
  requireDiagnosis = true,
  extras?: { publishedBudget?: boolean },
): boolean {
  if (extras?.publishedBudget) {
    return ![
      "cancelado",
      "cancelada",
      "faturado",
      "entregue",
    ].includes(status);
  }
  const afterDiagnosis = [
    "diagnostico_concluido",
    "aguardando_orcamento",
    "aguardando_aprovacao",
  ];
  if (!requireDiagnosis) {
    return [
      "rascunho",
      "aguardando_diagnostico",
      ...afterDiagnosis,
    ].includes(status);
  }
  return afterDiagnosis.includes(status);
}

/** Item não pode aparecer como aprovado antes da OS chegar à aprovação. */
export function effectiveItemAprovacaoStatus(
  osStatus: string,
  itemStatus: string,
): string {
  const afterCustomerDecision = [
    "aguardando_aprovacao",
    "aprovado",
    "parcialmente_aprovado",
    "em_execucao",
    "aguardando_peca",
    "aguardando_cliente",
    "pronto_para_entrega",
    "entregue",
    "faturado",
    "retorno",
    "garantia",
  ];
  if (afterCustomerDecision.includes(osStatus)) return itemStatus;
  if (itemStatus === "aprovado" || itemStatus === "reprovado") return "pendente";
  return itemStatus;
}

export function canFaturarStatus(status: string): boolean {
  return ["entregue", "pronto_para_entrega", "aprovado", "parcialmente_aprovado", "em_execucao"].includes(
    status,
  );
}

export function isTerminalCancelado(status: string): boolean {
  return status === "cancelado" || status === "cancelada";
}

export const OS_CHECKLIST_TEMPLATE = [
  { codigo: "ext_frente", label: "Frente", categoria: "externo", ordem: 1 },
  { codigo: "ext_traseira", label: "Traseira", categoria: "externo", ordem: 2 },
  { codigo: "ext_lateral_esquerda", label: "Lateral esquerda", categoria: "externo", ordem: 3 },
  { codigo: "ext_lateral_direita", label: "Lateral direita", categoria: "externo", ordem: 4 },
  { codigo: "rodas_pneus", label: "Rodas / pneus", categoria: "externo", ordem: 5 },
  {
    codigo: "riscos_amassados",
    label: "Riscos / amassados aparentes",
    categoria: "externo",
    ordem: 6,
  },
  { codigo: "painel", label: "Painel", categoria: "interno", ordem: 7 },
  { codigo: "bancos", label: "Bancos", categoria: "interno", ordem: 8 },
  {
    codigo: "objetos_veiculo",
    label: "Objetos deixados no veículo",
    categoria: "interno",
    ordem: 9,
  },
  {
    codigo: "cofre_superior",
    label: "Foto geral do cofre do motor — vista superior",
    categoria: "motor",
    ordem: 10,
  },
  {
    codigo: "motor_inferior",
    label: "Foto inferior do motor / proteção inferior (quando acessível / aplicável)",
    categoria: "motor",
    ordem: 11,
  },
  { codigo: "placa", label: "Placa", categoria: "dados", ordem: 12 },
  { codigo: "quilometragem", label: "Km de entrada", categoria: "dados", ordem: 13 },
  { codigo: "combustivel", label: "Nível de combustível", categoria: "dados", ordem: 14 },
  { codigo: "observacoes_entrada", label: "Observações", categoria: "dados", ordem: 15 },
  { codigo: "pneus", label: "Pneus (estado)", categoria: "rodagem", ordem: 16 },
  { codigo: "freios", label: "Freios", categoria: "freios", ordem: 17 },
  { codigo: "motor", label: "Motor (inspeção operacional)", categoria: "mecanica", ordem: 18 },
  { codigo: "fluidos", label: "Fluidos", categoria: "mecanica", ordem: 19 },
  { codigo: "documentos", label: "Documentos", categoria: "documentacao", ordem: 20 },
] as const;

export const LAVA_RAPIDO_CHECKLIST_TEMPLATE = [
  { codigo: "riscos", label: "Riscos", categoria: "exterior", ordem: 1 },
  { codigo: "amassados", label: "Amassados", categoria: "exterior", ordem: 2 },
  { codigo: "pintura", label: "Pintura", categoria: "exterior", ordem: 3 },
  { codigo: "para_choques", label: "Para-choques", categoria: "exterior", ordem: 4 },
  { codigo: "rodas", label: "Rodas", categoria: "exterior", ordem: 5 },
  { codigo: "pneus", label: "Pneus", categoria: "exterior", ordem: 6 },
  { codigo: "vidros", label: "Vidros", categoria: "exterior", ordem: 7 },
  { codigo: "retrovisores", label: "Retrovisores", categoria: "exterior", ordem: 8 },
  { codigo: "bancos", label: "Bancos", categoria: "interior", ordem: 9 },
  { codigo: "painel", label: "Painel", categoria: "interior", ordem: 10 },
  { codigo: "console", label: "Console", categoria: "interior", ordem: 11 },
  { codigo: "tapetes", label: "Tapetes", categoria: "interior", ordem: 12 },
  { codigo: "teto", label: "Teto", categoria: "interior", ordem: 13 },
  { codigo: "porta_malas", label: "Porta-malas", categoria: "interior", ordem: 14 },
  {
    codigo: "objetos_veiculo",
    label: "Objetos deixados no veículo",
    categoria: "objetos",
    ordem: 15,
  },
  {
    codigo: "pertences",
    label: "Pertences pessoais",
    categoria: "objetos",
    ordem: 16,
  },
  { codigo: "fotos_entrada", label: "Fotos de entrada", categoria: "registro", ordem: 17 },
  {
    codigo: "observacoes_entrada",
    label: "Observações de entrada",
    categoria: "registro",
    ordem: 18,
  },
  {
    codigo: "confirmacao_cliente",
    label: "Confirmação do cliente",
    categoria: "registro",
    ordem: 19,
  },
  {
    codigo: "servico_executado",
    label: "Serviço executado",
    categoria: "saida",
    ordem: 20,
  },
  {
    codigo: "conferencia_visual",
    label: "Conferência visual",
    categoria: "saida",
    ordem: 21,
  },
  { codigo: "fotos_finais", label: "Fotos finais", categoria: "saida", ordem: 22 },
  {
    codigo: "observacoes_entrega",
    label: "Observações da entrega",
    categoria: "saida",
    ordem: 23,
  },
  {
    codigo: "combustivel",
    label: "Nível de combustível",
    categoria: "geral",
    ordem: 24,
  },
  {
    codigo: "quilometragem",
    label: "Quilometragem",
    categoria: "geral",
    ordem: 25,
  },
] as const;

export type OsChecklistSeedItem = {
  codigo: string;
  label: string;
  categoria: string;
  ordem: number;
};

export function getOsChecklistTemplate(
  kind: "oficina" | "lava_rapido",
): readonly OsChecklistSeedItem[] {
  if (kind === "lava_rapido") return LAVA_RAPIDO_CHECKLIST_TEMPLATE;
  return OS_CHECKLIST_TEMPLATE;
}

export const OS_PRIORIDADE_OPTIONS = [
  { value: "baixa", label: "Baixa" },
  { value: "normal", label: "Normal" },
  { value: "alta", label: "Alta" },
  { value: "urgente", label: "Urgente" },
] as const;

export const OS_APROVACAO_CANAL_OPTIONS = [
  { value: "presencial", label: "Presencial" },
  { value: "telefone", label: "Telefone" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "E-mail" },
  { value: "outro", label: "Outro" },
] as const;

export const OS_DEFAULT_PER_PAGE = 20;
