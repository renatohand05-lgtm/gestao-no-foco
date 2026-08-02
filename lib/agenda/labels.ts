/**
 * Labels agenda — seguro para client components.
 */

export function labelAgendaStatus(status: string): string {
  const map: Record<string, string> = {
    agendado: "Agendado",
    confirmado: "Confirmado",
    realizado: "Realizado",
    cancelado: "Cancelado",
    reagendado: "Reagendado",
  };
  return map[status] ?? status;
}

export function labelAgendaTipo(tipo: string): string {
  const map: Record<string, string> = {
    compromisso: "Compromisso",
    tarefa: "Tarefa",
    visita: "Visita",
    os: "Ordem de serviço",
    follow_up: "Follow-up",
    outro: "Outro",
  };
  return map[tipo] ?? tipo;
}
