/**
 * Labels agenda — seguro para client components.
 */

export function labelAgendaStatus(status: string): string {
  const map: Record<string, string> = {
    agendado: "Agendado",
    aguardando_confirmacao: "Aguardando confirmação",
    confirmado: "Confirmado",
    cliente_chegou: "Cliente chegou",
    em_atendimento: "Em atendimento",
    concluido: "Concluído",
    realizado: "Concluído",
    cancelado: "Cancelado",
    nao_compareceu: "Não compareceu",
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
    atendimento: "Atendimento",
    reuniao_presencial: "Reunião presencial",
    reuniao_interna: "Reunião interna",
    call: "Call",
    videoconferencia: "Videoconferência",
    reuniao_comercial: "Reunião comercial",
    reuniao_fornecedor: "Reunião com fornecedor",
    reuniao_parceiro: "Reunião com parceiro",
    visita_externa: "Visita externa",
    treinamento: "Treinamento",
    entrevista: "Entrevista",
    apresentacao: "Apresentação",
    mentoria: "Mentoria",
    planejamento: "Planejamento",
    evento: "Evento",
    tarefa_horario: "Tarefa com horário",
    bloqueio: "Bloqueio de horário",
    almoco: "Almoço",
    intervalo: "Intervalo",
    folga: "Folga",
    ferias: "Férias",
    ausencia: "Ausência",
    treinamento_interno: "Treinamento interno",
    administrativo: "Administrativo",
    manutencao: "Manutenção",
    indisponivel: "Horário indisponível",
    outro: "Outro",
  };
  return map[tipo] ?? tipo;
}
