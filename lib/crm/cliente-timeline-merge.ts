import type {
  Cliente360Ordem,
  Cliente360Venda,
  ClienteAgendamento,
  ClienteEvento,
  ClienteTarefa,
} from "@/types/crm";

export type TimelineDisplayEvent = ClienteEvento & {
  autor_nome?: string | null;
  sintetico?: boolean;
};

/** Mescla eventos persistidos com atividades de OS, vendas, tarefas e agenda. */
export function mergeClienteTimeline(input: {
  eventos: ClienteEvento[];
  ordens: Cliente360Ordem[];
  vendas: Cliente360Venda[];
  tarefas: ClienteTarefa[];
  agendamentos: ClienteAgendamento[];
  profileNames: Record<string, string>;
}): TimelineDisplayEvent[] {
  const merged: TimelineDisplayEvent[] = input.eventos.map((e) => ({
    ...e,
    autor_nome: e.user_id ? (input.profileNames[e.user_id] ?? null) : null,
    sintetico: false,
  }));

  for (const os of input.ordens) {
    merged.push({
      id: `os-${os.id}`,
      tenant_id: "",
      cliente_id: "",
      tipo: "os",
      titulo: `Ordem de serviço #${os.numero ?? os.id.slice(0, 8)}`,
      descricao: `Status: ${os.status}`,
      referencia_tipo: "ordem_servico",
      referencia_id: os.id,
      payload: { valor_total: os.valor_total },
      user_id: null,
      created_at: os.created_at,
      sintetico: true,
    });
  }

  for (const v of input.vendas) {
    merged.push({
      id: `venda-${v.id}`,
      tenant_id: "",
      cliente_id: "",
      tipo: "venda",
      titulo: `Venda #${v.numero ?? v.id.slice(0, 8)}`,
      descricao: `Total ${v.total} · ${v.status}`,
      referencia_tipo: "venda",
      referencia_id: v.id,
      payload: { total: v.total },
      user_id: null,
      created_at: v.created_at,
      sintetico: true,
    });
  }

  for (const t of input.tarefas) {
    if (t.status === "cancelada") continue;
    merged.push({
      id: `tarefa-${t.id}`,
      tenant_id: t.tenant_id,
      cliente_id: t.cliente_id,
      tipo: "tarefa",
      titulo: t.titulo,
      descricao: `${t.tipo} · ${t.status}`,
      referencia_tipo: "cliente_tarefa",
      referencia_id: t.id,
      payload: {},
      user_id: t.created_by,
      created_at: t.created_at,
      autor_nome: t.created_by
        ? (input.profileNames[t.created_by] ?? null)
        : null,
      sintetico: true,
    });
  }

  for (const a of input.agendamentos) {
    merged.push({
      id: `agenda-${a.id}`,
      tenant_id: a.tenant_id,
      cliente_id: a.cliente_id,
      tipo: "agenda",
      titulo: a.titulo,
      descricao: `${a.tipo} · ${a.status}`,
      referencia_tipo: "cliente_agendamento",
      referencia_id: a.id,
      payload: {},
      user_id: a.created_by,
      created_at: a.inicio,
      autor_nome: a.created_by
        ? (input.profileNames[a.created_by] ?? null)
        : null,
      sintetico: true,
    });
  }

  return merged.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

export function resolveUltimoContato(eventos: TimelineDisplayEvent[]): string | null {
  if (!eventos.length) return null;
  return eventos[0]?.created_at ?? null;
}
