/**
 * Central Inteligente de Clientes — CRM Executivo (Gate 18.2).
 * Composição pura a partir de dados já existentes. Sem SQL/API públicos novos.
 */

export const CRM_EXEC_INATIVO_DIAS = 180;
export const CRM_EXEC_VIP_FATURAMENTO = 10_000;
export const CRM_EXEC_OURO_FATURAMENTO = 5_000;
export const CRM_EXEC_PRATA_FATURAMENTO = 1_500;
export const CRM_EXEC_VIP_VISITAS = 4;
export const CRM_EXEC_OURO_VISITAS = 3;
export const CRM_EXEC_PRATA_VISITAS = 2;
export const CRM_EXEC_VIP_TICKET = 500;
export const CRM_EXEC_OURO_TICKET = 400;
export const CRM_EXEC_REVISAO_PROXIMA_DIAS = 30;

export const CRM_EXEC_SEGMENTOS = ["VIP", "Ouro", "Prata", "Bronze"] as const;
export type CrmExecSegmento = (typeof CRM_EXEC_SEGMENTOS)[number];

export const CRM_EXEC_RANKING_KEYS = [
  "faturamento",
  "ticket",
  "recorrencia",
  "servicos",
  "veiculos",
] as const;
export type CrmExecRankingKey = (typeof CRM_EXEC_RANKING_KEYS)[number];

export const CRM_EXEC_RANKING_LABELS: Record<CrmExecRankingKey, string> = {
  faturamento: "Maior faturamento",
  ticket: "Maior ticket médio",
  recorrencia: "Mais recorrentes",
  servicos: "Mais serviços realizados",
  veiculos: "Mais veículos",
};

export type CrmExecRiscoMotivo =
  | "sem_retorno_180"
  | "orcamento_aprovado_sem_os"
  | "orcamento_aguardando"
  | "revisao_vencida"
  | "retorno_pendente";

export type CrmExecOportunidadeTipo =
  | "orcamento_aguardando"
  | "revisao_proxima"
  | "revisao_vencida"
  | "recorrente_sem_visita"
  | "vip_sem_retorno"
  | "varios_veiculos";

export type CrmExecClienteBase = {
  id: string;
  nome: string;
  telefone: string | null;
  whatsapp: string | null;
  ativo: boolean;
  created_at: string;
};

export type CrmExecOsEvent = {
  id: string;
  cliente_id: string;
  status: string;
  created_at: string;
  valor_total: number;
};

export type CrmExecVendaEvent = {
  id: string;
  cliente_id: string;
  status: string;
  total: number;
  created_at: string;
  data_venda?: string | null;
};

export type CrmExecVeiculoRef = {
  id: string;
  cliente_id: string;
};

export type CrmExecTarefaRef = {
  id: string;
  cliente_id: string;
  tipo: string;
  status: string;
  data_vencimento: string | null;
  titulo: string;
};

export type CrmExecAgendaRef = {
  id: string;
  cliente_id: string;
  tipo: string;
  status: string;
  inicio: string;
  titulo: string;
};

export type CrmExecTagRef = {
  entity_id: string;
  nome: string;
};

export type CrmExecItemFreq = {
  descricao: string;
  quantidade: number;
};

export type CrmExecPortfolioInput = {
  clientes: CrmExecClienteBase[];
  ordens: CrmExecOsEvent[];
  vendas: CrmExecVendaEvent[];
  veiculos: CrmExecVeiculoRef[];
  tarefas: CrmExecTarefaRef[];
  agendamentos: CrmExecAgendaRef[];
  tags: CrmExecTagRef[];
  now?: Date;
};

export type CrmExecClienteIntel = {
  id: string;
  nome: string;
  telefone: string | null;
  whatsapp: string | null;
  ativo: boolean;
  created_at: string;
  faturamento: number;
  ticketMedio: number;
  visitas: number;
  servicos: number;
  veiculos: number;
  recorrente: boolean;
  ultimaVisita: string | null;
  primeiraVisita: string | null;
  diasSemRetorno: number | null;
  proximaRevisao: string | null;
  segmento: CrmExecSegmento;
  hasVipTag: boolean;
  orcamentoAguardandoValor: number;
  orcamentoAprovadoValor: number;
  revisaoVencida: boolean;
  retornoPendente: boolean;
};

export type CrmExecKpis = {
  clientesAtivos: number;
  clientesInativos180: number;
  clientesNovosMes: number;
  clientesRecorrentes: number;
  ticketMedioPorCliente: number;
  faturamentoPorCliente: number;
  totalGastoLifetime: number;
  mediaVisitas: number;
  ultimaVisitaCarteira: string | null;
  proximaRevisaoPrevista: string | null;
};

export type CrmExecRankingRow = {
  id: string;
  nome: string;
  telefone: string | null;
  segmento: CrmExecSegmento;
  faturamento: number;
  ticketMedio: number;
  visitas: number;
  servicos: number;
  veiculos: number;
  valor: number;
};

export type CrmExecRiscoItem = {
  id: string;
  nome: string;
  telefone: string | null;
  ultimaVisita: string | null;
  diasSemRetorno: number | null;
  valorPotencial: number;
  motivo: CrmExecRiscoMotivo;
  motivoLabel: string;
  acaoRecomendada: string;
};

export type CrmExecOportunidadeItem = {
  id: string;
  clienteId: string;
  nome: string;
  telefone: string | null;
  tipo: CrmExecOportunidadeTipo;
  tipoLabel: string;
  valorPotencial: number;
  detalhe: string;
  acaoRecomendada: string;
};

export type CrmExecAcaoItem = {
  clienteId: string;
  nome: string;
  acao: string;
  motivo: string;
};

export type CrmExecPerfilInput = {
  cliente: CrmExecClienteBase;
  ordens: CrmExecOsEvent[];
  vendas: CrmExecVendaEvent[];
  veiculos: CrmExecVeiculoRef[];
  tarefas: CrmExecTarefaRef[];
  agendamentos: CrmExecAgendaRef[];
  tags: string[];
  financeiro: Array<{
    id: string;
    descricao: string;
    valor_original: number;
    status: string;
    data_vencimento: string;
  }>;
  itensServico?: CrmExecItemFreq[];
  itensPeca?: CrmExecItemFreq[];
  now?: Date;
};

export type CrmExecPerfil = {
  faturamentoTotal: number;
  quantidadeOs: number;
  ticketMedio: number;
  ultimaVisita: string | null;
  primeiraVisita: string | null;
  veiculos: number;
  segmento: CrmExecSegmento;
  visitas: number;
  recorrente: boolean;
  proximaRevisao: string | null;
  diasSemRetorno: number | null;
  servicosMaisFrequentes: CrmExecItemFreq[];
  pecasMaisCompradas: CrmExecItemFreq[];
  evolucaoMensal: Array<{ label: string; data: string; value: number }>;
  historicoFinanceiro: Array<{
    id: string;
    descricao: string;
    valor: number;
    status: string;
    data_vencimento: string;
  }>;
  acoesRecomendadas: string[];
};

const OS_ORCAMENTO_AGUARDANDO = new Set(["orcamento", "aguardando_aprovacao"]);
const OS_ORCAMENTO_APROVADO = new Set(["aprovado", "parcialmente_aprovado"]);
const OS_RETORNO = new Set(["retorno"]);
const TAREFA_ABERTA = new Set(["pendente", "em_andamento"]);
const AGENDA_ATIVA = new Set(["agendado", "confirmado", "pendente", "aberto"]);

const RISCO_LABELS: Record<CrmExecRiscoMotivo, string> = {
  sem_retorno_180: "Mais de 180 dias sem retorno",
  orcamento_aprovado_sem_os: "Orçamento aprovado sem OS",
  orcamento_aguardando: "Orçamento aguardando",
  revisao_vencida: "Revisão vencida",
  retorno_pendente: "Retorno pendente",
};

const OPORTUNIDADE_LABELS: Record<CrmExecOportunidadeTipo, string> = {
  orcamento_aguardando: "Orçamento aguardando aprovação",
  revisao_proxima: "Revisão próxima",
  revisao_vencida: "Revisão vencida",
  recorrente_sem_visita: "Cliente recorrente sem visita recente",
  vip_sem_retorno: "Cliente VIP sem retorno",
  varios_veiculos: "Cliente com vários veículos",
};

function dayKey(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = iso.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
}

function daysBetween(fromIso: string, to: Date): number {
  const from = new Date(`${fromIso.slice(0, 10)}T00:00:00.000Z`);
  const end = new Date(
    Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()),
  );
  return Math.floor((end.getTime() - from.getTime()) / 86_400_000);
}

function startOfMonthUtc(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function phoneOf(c: CrmExecClienteBase): string | null {
  const t = c.telefone?.trim() || c.whatsapp?.trim() || null;
  return t || null;
}

function isVipTagName(nome: string): boolean {
  return nome.trim().toLowerCase() === "vip";
}

function vendaDate(v: CrmExecVendaEvent): string {
  return dayKey(v.data_venda) ?? dayKey(v.created_at) ?? v.created_at;
}

function isVendaFaturada(v: CrmExecVendaEvent): boolean {
  return v.status === "faturado";
}

function isOrcamentoVenda(v: CrmExecVendaEvent): boolean {
  return v.status === "orcamento" || v.status === "em_andamento";
}

export function classifyCrmExecSegmento(input: {
  faturamento: number;
  visitas: number;
  ticketMedio: number;
  recorrente: boolean;
  hasVipTag?: boolean;
}): CrmExecSegmento {
  const {
    faturamento,
    visitas,
    ticketMedio,
    recorrente,
    hasVipTag = false,
  } = input;

  if (
    hasVipTag ||
    (faturamento >= CRM_EXEC_VIP_FATURAMENTO &&
      visitas >= CRM_EXEC_VIP_VISITAS &&
      ticketMedio >= CRM_EXEC_VIP_TICKET) ||
    (faturamento >= CRM_EXEC_VIP_FATURAMENTO * 1.5 && recorrente)
  ) {
    return "VIP";
  }

  if (
    (faturamento >= CRM_EXEC_OURO_FATURAMENTO &&
      visitas >= CRM_EXEC_OURO_VISITAS) ||
    (faturamento >= 3_000 &&
      recorrente &&
      ticketMedio >= CRM_EXEC_OURO_TICKET)
  ) {
    return "Ouro";
  }

  if (
    (faturamento >= CRM_EXEC_PRATA_FATURAMENTO &&
      visitas >= CRM_EXEC_PRATA_VISITAS) ||
    recorrente
  ) {
    return "Prata";
  }

  return "Bronze";
}

export function resolveCrmExecRankingKey(
  raw?: string | null,
): CrmExecRankingKey {
  if (raw && (CRM_EXEC_RANKING_KEYS as readonly string[]).includes(raw)) {
    return raw as CrmExecRankingKey;
  }
  return "faturamento";
}

function buildIntelMap(input: CrmExecPortfolioInput): CrmExecClienteIntel[] {
  const now = input.now ?? new Date();
  const today = dayKey(now.toISOString())!;

  const osByCliente = new Map<string, CrmExecOsEvent[]>();
  for (const o of input.ordens) {
    if (!o.cliente_id) continue;
    const list = osByCliente.get(o.cliente_id) ?? [];
    list.push(o);
    osByCliente.set(o.cliente_id, list);
  }

  const vendasByCliente = new Map<string, CrmExecVendaEvent[]>();
  for (const v of input.vendas) {
    if (!v.cliente_id) continue;
    const list = vendasByCliente.get(v.cliente_id) ?? [];
    list.push(v);
    vendasByCliente.set(v.cliente_id, list);
  }

  const veiculosByCliente = new Map<string, number>();
  for (const v of input.veiculos) {
    if (!v.cliente_id) continue;
    veiculosByCliente.set(
      v.cliente_id,
      (veiculosByCliente.get(v.cliente_id) ?? 0) + 1,
    );
  }

  const vipTags = new Set(
    input.tags.filter((t) => isVipTagName(t.nome)).map((t) => t.entity_id),
  );

  const tarefasByCliente = new Map<string, CrmExecTarefaRef[]>();
  for (const t of input.tarefas) {
    const list = tarefasByCliente.get(t.cliente_id) ?? [];
    list.push(t);
    tarefasByCliente.set(t.cliente_id, list);
  }

  const agendaByCliente = new Map<string, CrmExecAgendaRef[]>();
  for (const a of input.agendamentos) {
    const list = agendaByCliente.get(a.cliente_id) ?? [];
    list.push(a);
    agendaByCliente.set(a.cliente_id, list);
  }

  return input.clientes.map((c) => {
    const ordens = osByCliente.get(c.id) ?? [];
    const vendasAll = vendasByCliente.get(c.id) ?? [];
    const vendasFat = vendasAll.filter(isVendaFaturada);

    let faturamentoOs = 0;
    let orcamentoAguardandoValor = 0;
    let orcamentoAprovadoValor = 0;
    const visitDates: string[] = [];

    for (const o of ordens) {
      const created = dayKey(o.created_at) ?? o.created_at;
      visitDates.push(created);
      if (OS_ORCAMENTO_AGUARDANDO.has(o.status)) {
        orcamentoAguardandoValor += o.valor_total;
      } else if (OS_ORCAMENTO_APROVADO.has(o.status)) {
        orcamentoAprovadoValor += o.valor_total;
      } else if (!OS_ORCAMENTO_AGUARDANDO.has(o.status)) {
        // Conta receita de OS não-orçamento (executada / faturada / etc.)
        if (
          !["cancelado", "cancelada", "rascunho"].includes(o.status)
        ) {
          faturamentoOs += o.valor_total;
        }
      }
    }

    let faturamentoVendas = 0;
    for (const v of vendasFat) {
      faturamentoVendas += Number(v.total ?? 0);
      visitDates.push(vendaDate(v));
    }
    for (const v of vendasAll.filter(isOrcamentoVenda)) {
      orcamentoAguardandoValor += Number(v.total ?? 0);
    }

    const faturamento = round2(faturamentoOs + faturamentoVendas);
    const servicos = ordens.length;
    const visitas = ordens.length + vendasFat.length;
    const ticketMedio = visitas > 0 ? round2(faturamento / visitas) : 0;
    const recorrente = visitas >= 2;
    visitDates.sort();
    const primeiraVisita = visitDates[0] ?? null;
    const ultimaVisita = visitDates[visitDates.length - 1] ?? null;
    const diasSemRetorno = ultimaVisita
      ? daysBetween(ultimaVisita, now)
      : daysBetween(dayKey(c.created_at) ?? c.created_at, now);

    const tarefas = tarefasByCliente.get(c.id) ?? [];
    const agendas = agendaByCliente.get(c.id) ?? [];

    const revisaoVencida = tarefas.some(
      (t) =>
        t.tipo === "revisao" &&
        TAREFA_ABERTA.has(t.status) &&
        t.data_vencimento != null &&
        t.data_vencimento.slice(0, 10) < today,
    );

    const retornoPendente =
      agendas.some(
        (a) =>
          a.tipo === "retorno" &&
          (AGENDA_ATIVA.has(a.status) || !a.status) &&
          a.inicio.slice(0, 10) <= today,
      ) || ordens.some((o) => OS_RETORNO.has(o.status));

    const proximaCandidates: string[] = [];
    for (const t of tarefas) {
      if (
        t.tipo === "revisao" &&
        TAREFA_ABERTA.has(t.status) &&
        t.data_vencimento &&
        t.data_vencimento.slice(0, 10) >= today
      ) {
        proximaCandidates.push(t.data_vencimento.slice(0, 10));
      }
    }
    for (const a of agendas) {
      if (
        (a.tipo === "visita" || a.tipo === "retorno") &&
        a.inicio.slice(0, 10) >= today
      ) {
        proximaCandidates.push(a.inicio.slice(0, 10));
      }
    }
    proximaCandidates.sort();
    const proximaRevisao = proximaCandidates[0] ?? null;

    const hasVipTag = vipTags.has(c.id);
    const segmento = classifyCrmExecSegmento({
      faturamento,
      visitas,
      ticketMedio,
      recorrente,
      hasVipTag,
    });

    return {
      id: c.id,
      nome: c.nome,
      telefone: phoneOf(c),
      whatsapp: c.whatsapp,
      ativo: c.ativo,
      created_at: c.created_at,
      faturamento,
      ticketMedio,
      visitas,
      servicos,
      veiculos: veiculosByCliente.get(c.id) ?? 0,
      recorrente,
      ultimaVisita,
      primeiraVisita,
      diasSemRetorno,
      proximaRevisao,
      segmento,
      hasVipTag,
      orcamentoAguardandoValor: round2(orcamentoAguardandoValor),
      orcamentoAprovadoValor: round2(orcamentoAprovadoValor),
      revisaoVencida,
      retornoPendente,
    };
  });
}

export function composeCrmExecKpis(
  intel: CrmExecClienteIntel[],
  now: Date = new Date(),
): CrmExecKpis {
  const monthStart = startOfMonthUtc(now).toISOString();

  let clientesAtivos = 0;
  let clientesInativos180 = 0;
  let clientesNovosMes = 0;
  let clientesRecorrentes = 0;
  let somaTicket = 0;
  let comTicket = 0;
  let somaFat = 0;
  let comFat = 0;
  let totalGastoLifetime = 0;
  let somaVisitas = 0;
  let ultimaVisitaCarteira: string | null = null;
  let proximaRevisaoPrevista: string | null = null;

  for (const c of intel) {
    const inativo180 =
      c.diasSemRetorno != null && c.diasSemRetorno > CRM_EXEC_INATIVO_DIAS;
    if (c.ativo && !inativo180) clientesAtivos += 1;
    if (inativo180) clientesInativos180 += 1;
    if (c.created_at >= monthStart) clientesNovosMes += 1;
    if (c.recorrente) clientesRecorrentes += 1;
    if (c.visitas > 0) {
      somaTicket += c.ticketMedio;
      comTicket += 1;
      somaVisitas += c.visitas;
    }
    if (c.faturamento > 0) {
      somaFat += c.faturamento;
      comFat += 1;
    }
    totalGastoLifetime += c.faturamento;
    if (
      c.ultimaVisita &&
      (!ultimaVisitaCarteira || c.ultimaVisita > ultimaVisitaCarteira)
    ) {
      ultimaVisitaCarteira = c.ultimaVisita;
    }
    if (
      c.proximaRevisao &&
      (!proximaRevisaoPrevista || c.proximaRevisao < proximaRevisaoPrevista)
    ) {
      proximaRevisaoPrevista = c.proximaRevisao;
    }
  }

  const n = intel.length;
  return {
    clientesAtivos,
    clientesInativos180,
    clientesNovosMes,
    clientesRecorrentes,
    ticketMedioPorCliente: comTicket > 0 ? round2(somaTicket / comTicket) : 0,
    faturamentoPorCliente: comFat > 0 ? round2(somaFat / comFat) : 0,
    totalGastoLifetime: round2(totalGastoLifetime),
    mediaVisitas: n > 0 ? round2(somaVisitas / n) : 0,
    ultimaVisitaCarteira,
    proximaRevisaoPrevista,
  };
}

export function composeCrmExecRanking(
  intel: CrmExecClienteIntel[],
  key: CrmExecRankingKey = "faturamento",
  limit = 10,
): CrmExecRankingRow[] {
  const valueOf = (c: CrmExecClienteIntel): number => {
    switch (key) {
      case "ticket":
        return c.ticketMedio;
      case "recorrencia":
        return c.visitas;
      case "servicos":
        return c.servicos;
      case "veiculos":
        return c.veiculos;
      case "faturamento":
      default:
        return c.faturamento;
    }
  };

  return [...intel]
    .sort((a, b) => {
      const diff = valueOf(b) - valueOf(a);
      if (diff !== 0) return diff;
      return a.nome.localeCompare(b.nome, "pt-BR");
    })
    .slice(0, limit)
    .map((c) => ({
      id: c.id,
      nome: c.nome,
      telefone: c.telefone,
      segmento: c.segmento,
      faturamento: c.faturamento,
      ticketMedio: c.ticketMedio,
      visitas: c.visitas,
      servicos: c.servicos,
      veiculos: c.veiculos,
      valor: valueOf(c),
    }));
}

export function recommendCrmExecAction(input: {
  motivo?: CrmExecRiscoMotivo | CrmExecOportunidadeTipo | null;
  segmento?: CrmExecSegmento;
  orcamentoAguardando?: boolean;
  revisaoVencida?: boolean;
  revisaoProxima?: boolean;
  semRetorno180?: boolean;
  recorrenteSemVisita?: boolean;
}): string {
  if (input.motivo === "orcamento_aguardando" || input.orcamentoAguardando) {
    return "Enviar orçamento.";
  }
  if (input.motivo === "orcamento_aprovado_sem_os") {
    return "Abrir OS e agendar execução.";
  }
  if (
    input.motivo === "revisao_vencida" ||
    input.motivo === "revisao_proxima" ||
    input.revisaoVencida ||
    input.revisaoProxima
  ) {
    return "Agendar revisão.";
  }
  if (input.motivo === "retorno_pendente") {
    return "Ligar para cliente.";
  }
  if (
    input.motivo === "sem_retorno_180" ||
    input.motivo === "vip_sem_retorno" ||
    input.semRetorno180
  ) {
    return "Ligar para cliente.";
  }
  if (
    input.motivo === "recorrente_sem_visita" ||
    input.recorrenteSemVisita
  ) {
    return "Oferecer troca de óleo.";
  }
  if (input.motivo === "varios_veiculos") {
    return "Cliente pronto para fidelização.";
  }
  if (input.segmento === "VIP" || input.segmento === "Ouro") {
    return "Cliente pronto para fidelização.";
  }
  return "Ligar para cliente.";
}

export function composeCrmExecRiscos(
  intel: CrmExecClienteIntel[],
): CrmExecRiscoItem[] {
  const items: CrmExecRiscoItem[] = [];

  for (const c of intel) {
    const push = (
      motivo: CrmExecRiscoMotivo,
      valorPotencial: number,
    ) => {
      items.push({
        id: `${c.id}:${motivo}`,
        nome: c.nome,
        telefone: c.telefone,
        ultimaVisita: c.ultimaVisita,
        diasSemRetorno: c.diasSemRetorno,
        valorPotencial: round2(valorPotencial),
        motivo,
        motivoLabel: RISCO_LABELS[motivo],
        acaoRecomendada: recommendCrmExecAction({ motivo }),
      });
    };

    if (c.diasSemRetorno != null && c.diasSemRetorno > CRM_EXEC_INATIVO_DIAS) {
      push("sem_retorno_180", c.faturamento || c.orcamentoAguardandoValor);
    }
    if (c.orcamentoAprovadoValor > 0) {
      push("orcamento_aprovado_sem_os", c.orcamentoAprovadoValor);
    }
    if (c.orcamentoAguardandoValor > 0) {
      push("orcamento_aguardando", c.orcamentoAguardandoValor);
    }
    if (c.revisaoVencida) {
      push("revisao_vencida", c.ticketMedio || c.faturamento);
    }
    if (c.retornoPendente) {
      push("retorno_pendente", c.ticketMedio || c.faturamento);
    }
  }

  return items.sort((a, b) => {
    const diasA = a.diasSemRetorno ?? 0;
    const diasB = b.diasSemRetorno ?? 0;
    if (diasB !== diasA) return diasB - diasA;
    return b.valorPotencial - a.valorPotencial;
  });
}

export function composeCrmExecOportunidades(
  intel: CrmExecClienteIntel[],
  now: Date = new Date(),
): CrmExecOportunidadeItem[] {
  const today = dayKey(now.toISOString())!;
  const limiar30 = new Date(now);
  limiar30.setUTCDate(limiar30.getUTCDate() + CRM_EXEC_REVISAO_PROXIMA_DIAS);
  const limiar30Key = dayKey(limiar30.toISOString())!;

  const items: CrmExecOportunidadeItem[] = [];

  for (const c of intel) {
    const push = (
      tipo: CrmExecOportunidadeTipo,
      valorPotencial: number,
      detalhe: string,
    ) => {
      items.push({
        id: `${c.id}:${tipo}`,
        clienteId: c.id,
        nome: c.nome,
        telefone: c.telefone,
        tipo,
        tipoLabel: OPORTUNIDADE_LABELS[tipo],
        valorPotencial: round2(valorPotencial),
        detalhe,
        acaoRecomendada: recommendCrmExecAction({ motivo: tipo }),
      });
    };

    if (c.orcamentoAguardandoValor > 0) {
      push(
        "orcamento_aguardando",
        c.orcamentoAguardandoValor,
        `Pipeline ${round2(c.orcamentoAguardandoValor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`,
      );
    }

    if (c.revisaoVencida) {
      push("revisao_vencida", c.ticketMedio, "Tarefa de revisão vencida");
    } else if (
      c.proximaRevisao &&
      c.proximaRevisao >= today &&
      c.proximaRevisao <= limiar30Key
    ) {
      push(
        "revisao_proxima",
        c.ticketMedio,
        `Revisão em ${c.proximaRevisao}`,
      );
    }

    if (
      c.recorrente &&
      c.diasSemRetorno != null &&
      c.diasSemRetorno > 90 &&
      c.diasSemRetorno <= CRM_EXEC_INATIVO_DIAS
    ) {
      push(
        "recorrente_sem_visita",
        c.ticketMedio,
        `${c.diasSemRetorno} dias sem retorno`,
      );
    }

    if (
      (c.segmento === "VIP" || c.hasVipTag) &&
      c.diasSemRetorno != null &&
      c.diasSemRetorno > 60
    ) {
      push(
        "vip_sem_retorno",
        c.faturamento,
        `${c.diasSemRetorno} dias sem retorno`,
      );
    }

    if (c.veiculos >= 3) {
      push(
        "varios_veiculos",
        c.faturamento,
        `${c.veiculos} veículos cadastrados`,
      );
    }
  }

  return items.sort((a, b) => b.valorPotencial - a.valorPotencial);
}

export function composeCrmExecAcoes(
  intel: CrmExecClienteIntel[],
  limit = 12,
): CrmExecAcaoItem[] {
  const riscos = composeCrmExecRiscos(intel).slice(0, limit);
  return riscos.map((r) => ({
    clienteId: r.id.split(":")[0]!,
    nome: r.nome,
    acao: r.acaoRecomendada,
    motivo: r.motivoLabel,
  }));
}

export function composeCrmExecPortfolio(input: CrmExecPortfolioInput) {
  const now = input.now ?? new Date();
  const intel = buildIntelMap(input);
  return {
    intel,
    kpis: composeCrmExecKpis(intel, now),
    rankings: {
      faturamento: composeCrmExecRanking(intel, "faturamento"),
      ticket: composeCrmExecRanking(intel, "ticket"),
      recorrencia: composeCrmExecRanking(intel, "recorrencia"),
      servicos: composeCrmExecRanking(intel, "servicos"),
      veiculos: composeCrmExecRanking(intel, "veiculos"),
    } satisfies Record<CrmExecRankingKey, CrmExecRankingRow[]>,
    riscos: composeCrmExecRiscos(intel),
    oportunidades: composeCrmExecOportunidades(intel, now),
    acoes: composeCrmExecAcoes(intel),
  };
}

function buildEvolucaoMensal(
  ordens: CrmExecOsEvent[],
  vendas: CrmExecVendaEvent[],
): Array<{ label: string; data: string; value: number }> {
  const buckets = new Map<string, number>();

  for (const o of ordens) {
    if (OS_ORCAMENTO_AGUARDANDO.has(o.status)) continue;
    if (["cancelado", "cancelada", "rascunho"].includes(o.status)) continue;
    const d = new Date(o.created_at);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    buckets.set(key, (buckets.get(key) ?? 0) + o.valor_total);
  }
  for (const v of vendas.filter(isVendaFaturada)) {
    const raw = vendaDate(v);
    const d = new Date(raw);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    buckets.set(key, (buckets.get(key) ?? 0) + Number(v.total ?? 0));
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([data, value]) => ({
      data,
      label: `${data.slice(5)}/${data.slice(2, 4)}`,
      value: round2(value),
    }));
}

export function composeCrmExecPerfil(input: CrmExecPerfilInput): CrmExecPerfil {
  const now = input.now ?? new Date();
  const portfolio = composeCrmExecPortfolio({
    clientes: [input.cliente],
    ordens: input.ordens,
    vendas: input.vendas,
    veiculos: input.veiculos,
    tarefas: input.tarefas,
    agendamentos: input.agendamentos,
    tags: input.tags.map((nome) => ({
      entity_id: input.cliente.id,
      nome,
    })),
    now,
  });
  const c = portfolio.intel[0]!;

  const acoes = new Set<string>();
  for (const r of portfolio.riscos) acoes.add(r.acaoRecomendada);
  for (const o of portfolio.oportunidades) acoes.add(o.acaoRecomendada);
  if (c.segmento === "VIP" || c.segmento === "Ouro") {
    acoes.add("Cliente pronto para fidelização.");
  }
  if (acoes.size === 0) acoes.add("Ligar para cliente.");

  return {
    faturamentoTotal: c.faturamento,
    quantidadeOs: c.servicos,
    ticketMedio: c.ticketMedio,
    ultimaVisita: c.ultimaVisita,
    primeiraVisita: c.primeiraVisita,
    veiculos: c.veiculos,
    segmento: c.segmento,
    visitas: c.visitas,
    recorrente: c.recorrente,
    proximaRevisao: c.proximaRevisao,
    diasSemRetorno: c.diasSemRetorno,
    servicosMaisFrequentes: (input.itensServico ?? []).slice(0, 5),
    pecasMaisCompradas: (input.itensPeca ?? []).slice(0, 5),
    evolucaoMensal: buildEvolucaoMensal(input.ordens, input.vendas),
    historicoFinanceiro: input.financeiro.map((f) => ({
      id: f.id,
      descricao: f.descricao,
      valor: f.valor_original,
      status: f.status,
      data_vencimento: f.data_vencimento,
    })),
    acoesRecomendadas: [...acoes].slice(0, 6),
  };
}

export function crmExecCentralHref(
  tenantSlug: string,
  ranking?: CrmExecRankingKey,
): string {
  const base = `/${tenantSlug}/clientes/central`;
  if (!ranking || ranking === "faturamento") return base;
  return `${base}?ranking=${ranking}`;
}

export function segmentTone(segmento: CrmExecSegmento): string {
  switch (segmento) {
    case "VIP":
      return "bg-amber-100 text-amber-950";
    case "Ouro":
      return "bg-yellow-100 text-yellow-900";
    case "Prata":
      return "bg-slate-100 text-slate-800";
    case "Bronze":
    default:
      return "bg-orange-100 text-orange-900";
  }
}
