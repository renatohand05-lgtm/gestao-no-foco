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
  rascunho: ["aguardando_diagnostico", "cancelado"],
  aguardando_diagnostico: [
    "diagnostico_concluido",
    "aguardando_orcamento",
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

export function canEditOrcamento(status: string): boolean {
  return [
    "diagnostico_concluido",
    "aguardando_orcamento",
    "aguardando_aprovacao",
    "parcialmente_aprovado",
  ].includes(status);
}

export function canApplyAprovacao(status: string): boolean {
  return [
    "diagnostico_concluido",
    "aguardando_orcamento",
    "aguardando_aprovacao",
  ].includes(status);
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
  { codigo: "pneus", label: "Pneus", categoria: "rodagem", ordem: 1 },
  { codigo: "rodas", label: "Rodas", categoria: "rodagem", ordem: 2 },
  { codigo: "estepe", label: "Estepe", categoria: "rodagem", ordem: 3 },
  { codigo: "freios", label: "Freios", categoria: "freios", ordem: 4 },
  { codigo: "suspensao", label: "Suspensão", categoria: "suspensao", ordem: 5 },
  { codigo: "direcao", label: "Direção", categoria: "direcao", ordem: 6 },
  { codigo: "motor", label: "Motor", categoria: "mecanica", ordem: 7 },
  { codigo: "fluidos", label: "Fluidos", categoria: "mecanica", ordem: 8 },
  { codigo: "vazamentos", label: "Vazamentos", categoria: "mecanica", ordem: 9 },
  { codigo: "bateria", label: "Bateria", categoria: "mecanica", ordem: 10 },
  { codigo: "transmissao", label: "Transmissão", categoria: "transmissao", ordem: 11 },
  { codigo: "sistema_eletrico", label: "Sistema elétrico", categoria: "eletrica", ordem: 12 },
  { codigo: "iluminacao", label: "Iluminação", categoria: "eletrica", ordem: 13 },
  { codigo: "lanternas", label: "Lanternas", categoria: "eletrica", ordem: 14 },
  { codigo: "farois", label: "Faróis", categoria: "eletrica", ordem: 15 },
  { codigo: "vidros", label: "Vidros", categoria: "vidros", ordem: 16 },
  { codigo: "retrovisores", label: "Retrovisores", categoria: "vidros", ordem: 17 },
  { codigo: "para_choques", label: "Para-choques", categoria: "lataria", ordem: 18 },
  { codigo: "lataria", label: "Lataria", categoria: "lataria", ordem: 19 },
  { codigo: "interior", label: "Interior", categoria: "interior", ordem: 20 },
  { codigo: "painel", label: "Painel", categoria: "interior", ordem: 21 },
  { codigo: "ar_condicionado", label: "Ar-condicionado", categoria: "interior", ordem: 22 },
  { codigo: "ferramentas", label: "Ferramentas", categoria: "acessorios", ordem: 23 },
  { codigo: "macaco", label: "Macaco", categoria: "acessorios", ordem: 24 },
  { codigo: "chave_roda", label: "Chave de roda", categoria: "acessorios", ordem: 25 },
  { codigo: "documentos", label: "Documentos", categoria: "documentacao", ordem: 26 },
  { codigo: "combustivel", label: "Nível de combustível", categoria: "geral", ordem: 27 },
  { codigo: "quilometragem", label: "Quilometragem", categoria: "geral", ordem: 28 },
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
