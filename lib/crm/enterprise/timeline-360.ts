/**
 * Fase 24 — Timeline 360° unificada (merge puro; sem inventar eventos).
 */

export type Crm360TimelineKind =
  | "venda"
  | "ordem_servico"
  | "orcamento"
  | "proposta"
  | "pagamento"
  | "recebimento"
  | "financeiro"
  | "contato"
  | "atendimento"
  | "anexo"
  | "observacao"
  | "tarefa"
  | "agendamento"
  | "auditoria"
  | "outro";

export type Crm360TimelineItem = {
  id: string;
  kind: Crm360TimelineKind;
  title: string;
  description: string | null;
  at: string;
  referenceType: string | null;
  referenceId: string | null;
  origin: string;
  amount?: number | null;
};

function mapEventTipo(tipo: string): Crm360TimelineKind {
  const t = tipo.toLowerCase();
  if (t.includes("observ")) return "observacao";
  if (t.includes("audit")) return "auditoria";
  if (t.includes("whats") || t.includes("lig") || t.includes("contato")) return "contato";
  if (t.includes("atend")) return "atendimento";
  return "outro";
}

/**
 * Consolida fontes já carregadas do Cliente360 em uma timeline única ordenada.
 */
export function buildUnifiedCrm360Timeline(args: {
  eventos?: Array<{
    id: string;
    tipo: string;
    titulo: string;
    descricao: string | null;
    referencia_tipo: string | null;
    referencia_id: string | null;
    created_at: string;
  }>;
  vendas?: Array<{ id: string; numero?: number | null; status: string; total: number; created_at: string }>;
  ordens?: Array<{ id: string; numero?: number | null; status: string; valor_total: number; created_at: string }>;
  orcamentos?: Array<{
    id: string;
    numero?: number | null;
    status: string;
    total: number;
    created_at: string;
    origem: string;
  }>;
  financeiro?: Array<{
    id: string;
    descricao: string;
    valor_original: number;
    status: string;
    data_vencimento: string;
  }>;
  tarefas?: Array<{ id: string; titulo: string; status: string; created_at: string; tipo?: string }>;
  agendamentos?: Array<{ id: string; titulo: string; inicio: string; tipo?: string; status: string }>;
  documentos?: Array<{ id: string; nome_arquivo: string; categoria: string; created_at: string }>;
}): Crm360TimelineItem[] {
  const items: Crm360TimelineItem[] = [];

  for (const e of args.eventos ?? []) {
    items.push({
      id: `evt-${e.id}`,
      kind: mapEventTipo(e.tipo),
      title: e.titulo,
      description: e.descricao,
      at: e.created_at,
      referenceType: e.referencia_tipo,
      referenceId: e.referencia_id,
      origin: "cliente_eventos",
    });
  }

  for (const v of args.vendas ?? []) {
    items.push({
      id: `venda-${v.id}`,
      kind: "venda",
      title: `Venda ${v.numero ?? v.id.slice(0, 8)} · ${v.status}`,
      description: null,
      at: v.created_at,
      referenceType: "venda",
      referenceId: v.id,
      origin: "vendas",
      amount: v.total,
    });
  }

  for (const o of args.ordens ?? []) {
    items.push({
      id: `os-${o.id}`,
      kind: "ordem_servico",
      title: `OS ${o.numero ?? o.id.slice(0, 8)} · ${o.status}`,
      description: null,
      at: o.created_at,
      referenceType: "ordem_servico",
      referenceId: o.id,
      origin: "ordens_servico",
      amount: o.valor_total,
    });
  }

  for (const orc of args.orcamentos ?? []) {
    items.push({
      id: `orc-${orc.id}`,
      kind: orc.origem === "venda" ? "proposta" : "orcamento",
      title: `Orçamento/proposta ${orc.numero ?? orc.id.slice(0, 8)} · ${orc.status}`,
      description: null,
      at: orc.created_at,
      referenceType: "orcamento",
      referenceId: orc.id,
      origin: orc.origem,
      amount: orc.total,
    });
  }

  for (const f of args.financeiro ?? []) {
    const kind: Crm360TimelineKind =
      f.status === "pago" || f.status === "recebido"
        ? "recebimento"
        : "financeiro";
    items.push({
      id: `fin-${f.id}`,
      kind,
      title: f.descricao,
      description: `Status ${f.status}`,
      at: f.data_vencimento,
      referenceType: "conta_receber",
      referenceId: f.id,
      origin: "contas_receber",
      amount: f.valor_original,
    });
  }

  for (const t of args.tarefas ?? []) {
    items.push({
      id: `tar-${t.id}`,
      kind: "tarefa",
      title: t.titulo,
      description: `Status ${t.status}${t.tipo ? ` · ${t.tipo}` : ""}`,
      at: t.created_at,
      referenceType: "cliente_tarefa",
      referenceId: t.id,
      origin: "cliente_tarefas",
    });
  }

  for (const a of args.agendamentos ?? []) {
    items.push({
      id: `agd-${a.id}`,
      kind: "agendamento",
      title: a.titulo,
      description: `Status ${a.status}${a.tipo ? ` · ${a.tipo}` : ""}`,
      at: a.inicio,
      referenceType: "cliente_agendamento",
      referenceId: a.id,
      origin: "cliente_agendamentos",
    });
  }

  for (const d of args.documentos ?? []) {
    items.push({
      id: `doc-${d.id}`,
      kind: "anexo",
      title: d.nome_arquivo,
      description: d.categoria,
      at: d.created_at,
      referenceType: "cliente_documento",
      referenceId: d.id,
      origin: "cliente_documentos",
    });
  }

  return items.sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
  );
}
