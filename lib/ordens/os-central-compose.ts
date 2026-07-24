/**
 * Central Inteligente de OS — composição pura (Gate 18.1 / 18.1.1).
 * Não altera serviços públicos, SQL nem regras de negócio.
 */

import type { OrdemServicoListItem } from "./ordem-servico-service";

export const OS_CENTRAL_LIST_LIMIT = 100;

export const OS_RESPONSAVEL_FALLBACK = "Não atribuído";

export type OsResponsavelSource =
  | "explicito"
  | "alocacao_principal"
  | "mecanico_id"
  | "profile_id"
  | "consultor_id"
  | "fallback";

export type OsResponsavelAlocacaoPrincipal = {
  mecanicoId: string;
  nomeCompleto?: string | null;
};

export type ResolveOsResponsavelInput = {
  responsavelExplicito?: string | null;
  mecanicoId?: string | null;
  consultorId?: string | null;
  consultorNome?: string | null;
  principalAlocacao?: OsResponsavelAlocacaoPrincipal | null;
  mecanicoNomeById?: Map<string, string> | Record<string, string>;
  profileNomeById?: Map<string, string> | Record<string, string>;
  consultorNomeById?: Map<string, string> | Record<string, string>;
};

export type ResolveOsResponsavelResult = {
  nome: string;
  source: OsResponsavelSource;
};

function asNameMap(
  value?: Map<string, string> | Record<string, string>,
): Map<string, string> {
  if (!value) return new Map();
  if (value instanceof Map) return value;
  return new Map(Object.entries(value));
}

function lookupName(
  map: Map<string, string>,
  id: string | null | undefined,
): string | null {
  if (!id) return null;
  const nome = map.get(id)?.trim();
  return nome ? nome : null;
}

/**
 * Resolver único de responsável da OS (Gate 18.1.1 / 18.5.1).
 * Ordem: explícito → alocação principal → mecanico_id → profile_id →
 * consultor_id (nome confiável) → fallback.
 * Nunca usa created_by.
 */
export function resolveOsResponsavel(
  input: ResolveOsResponsavelInput,
): ResolveOsResponsavelResult {
  const mecanicoNomeById = asNameMap(input.mecanicoNomeById);
  const profileNomeById = asNameMap(input.profileNomeById);
  const consultorNomeById = asNameMap(input.consultorNomeById);

  const explicito = input.responsavelExplicito?.trim();
  if (explicito) {
    return { nome: explicito, source: "explicito" };
  }

  const aloc = input.principalAlocacao;
  if (aloc?.mecanicoId) {
    const nomeAloc =
      aloc.nomeCompleto?.trim() ||
      lookupName(mecanicoNomeById, aloc.mecanicoId);
    if (nomeAloc) {
      return { nome: nomeAloc, source: "alocacao_principal" };
    }
  }

  if (input.mecanicoId) {
    const porMecanico = lookupName(mecanicoNomeById, input.mecanicoId);
    if (porMecanico) {
      return { nome: porMecanico, source: "mecanico_id" };
    }
    const porProfile = lookupName(profileNomeById, input.mecanicoId);
    if (porProfile) {
      return { nome: porProfile, source: "profile_id" };
    }
  }

  if (input.consultorId) {
    const porConsultor =
      input.consultorNome?.trim() ||
      lookupName(consultorNomeById, input.consultorId) ||
      lookupName(profileNomeById, input.consultorId);
    if (porConsultor) {
      return { nome: porConsultor, source: "consultor_id" };
    }
  }

  return { nome: OS_RESPONSAVEL_FALLBACK, source: "fallback" };
}

/** Espelha OS_STATUS_TERMINAL (metricas) — inline p/ Node tests. */
const OS_STATUS_TERMINAL = new Set([
  "entregue",
  "faturado",
  "cancelado",
  "cancelada",
]);

/** Espelha OS_STATUS_ABERTA (metricas) — inline p/ Node tests. */
const OS_STATUS_ABERTA = [
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
  "retorno",
  "garantia",
] as const;

const PRIORIDADE_LABELS: Record<string, string> = {
  baixa: "Baixa",
  normal: "Normal",
  alta: "Alta",
  urgente: "Urgente",
};

export type OsCentralSort =
  | "mais_atrasadas"
  | "maior_valor"
  | "mais_antigas"
  | "previstas_hoje"
  | "maior_prioridade";

export type OsSlaTone = "ok" | "hoje" | "atrasada" | "sem_previsao" | "terminal";

export type OsCentralRow = OrdemServicoListItem & {
  atrasada: boolean;
  /** Alias legado — significa “prevista para hoje”. */
  entregaHoje: boolean;
  previstaHoje: boolean;
  /** Horas desde data_abertura. */
  tempoDesdeAberturaHoras: number;
  slaTone: OsSlaTone;
  slaLabel: string;
};

export type OsCentralKpis = {
  abertas: number;
  emDiagnostico: number;
  aguardandoAprovacao: number;
  aguardandoPecas: number;
  emExecucao: number;
  finalizadasHoje: number;
  /** null = não renderizar KPI (sem aceite_entrega_em confiável). */
  entreguesHoje: number | null;
  atrasadas: number;
  ticketMedio: number;
  valorEmProducao: number;
};

export type OsCentralPagination = {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  from: number;
  to: number;
  hasNext: boolean;
  hasPrev: boolean;
  label: string;
};

export type OsCentralFilters = {
  status?: string;
  mecanico_id?: string;
  de?: string;
  ate?: string;
  cliente?: string;
  veiculo?: string;
  prioridade?: string;
  q?: string;
  incluir_arquivadas?: boolean;
  sort?: string;
  page?: number;
  perPage?: number;
};

const PRIORIDADE_RANK: Record<string, number> = {
  urgente: 4,
  alta: 3,
  normal: 2,
  baixa: 1,
};

const PRODUCAO_STATUS = new Set([
  "aprovado",
  "parcialmente_aprovado",
  "em_execucao",
  "aguardando_peca",
  "aguardando_cliente",
  "pronto_para_entrega",
]);

function isoToday(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

function previsaoDia(previsao: string | null): string | null {
  if (!previsao) return null;
  return previsao.slice(0, 10);
}

function hoursSinceDateOnly(dataAbertura: string, now = new Date()) {
  const start = new Date(`${dataAbertura.slice(0, 10)}T00:00:00`);
  const ms = now.getTime() - start.getTime();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60)));
}

export function prioridadeLabel(value: string) {
  return PRIORIDADE_LABELS[value] ?? value;
}

/** Label amigável: “Aberta há Xh” / “Aberta há Xd Yh”. */
export function formatTempoDesdeAbertura(horas: number) {
  if (horas < 24) return `Aberta há ${horas}h`;
  const dias = Math.floor(horas / 24);
  const rest = horas % 24;
  return rest > 0 ? `Aberta há ${dias}d ${rest}h` : `Aberta há ${dias}d`;
}

export function resolveSla(input: {
  status: string;
  previsaoEntrega: string | null;
  hoje?: string;
}): {
  tone: OsSlaTone;
  label: string;
  atrasada: boolean;
  previstaHoje: boolean;
} {
  const hoje = input.hoje ?? isoToday();
  if (OS_STATUS_TERMINAL.has(input.status)) {
    return {
      tone: "terminal",
      label: "Encerrada",
      atrasada: false,
      previstaHoje: false,
    };
  }
  const dia = previsaoDia(input.previsaoEntrega);
  if (!dia) {
    return {
      tone: "sem_previsao",
      label: "Sem previsão",
      atrasada: false,
      previstaHoje: false,
    };
  }
  if (dia < hoje) {
    return {
      tone: "atrasada",
      label: "Atrasada",
      atrasada: true,
      previstaHoje: false,
    };
  }
  if (dia === hoje) {
    return {
      tone: "hoje",
      label: "Prevista para hoje",
      atrasada: false,
      previstaHoje: true,
    };
  }
  return {
    tone: "ok",
    label: "No prazo",
    atrasada: false,
    previstaHoje: false,
  };
}

export function enrichOsCentralRows(
  items: OrdemServicoListItem[],
  opts?: {
    now?: Date;
  },
): OsCentralRow[] {
  const now = opts?.now ?? new Date();
  const hoje = isoToday(now);

  return items.map((item) => {
    const sla = resolveSla({
      status: item.status,
      previsaoEntrega: item.previsao_entrega,
      hoje,
    });

    return {
      ...item,
      atrasada: sla.atrasada,
      entregaHoje: sla.previstaHoje,
      previstaHoje: sla.previstaHoje,
      tempoDesdeAberturaHoras: hoursSinceDateOnly(item.data_abertura, now),
      slaTone: sla.tone,
      slaLabel: sla.label,
    };
  });
}

export function composeOsCentralKpis(
  items: OrdemServicoListItem[],
  opts?: {
    finalizadasHoje?: number;
    entreguesHoje?: number | null;
    ticketMedio?: number | null;
  },
): OsCentralKpis {
  const hoje = isoToday();
  const count = (...statuses: string[]) =>
    items.filter((i) => statuses.includes(i.status)).length;

  const abertas = items.filter((i) =>
    (OS_STATUS_ABERTA as readonly string[]).includes(i.status),
  ).length;

  const atrasadas = items.filter((i) => {
    const dia = previsaoDia(i.previsao_entrega);
    return (
      Boolean(dia) && dia! < hoje && !OS_STATUS_TERMINAL.has(i.status)
    );
  }).length;

  const emProducao = items.filter((i) => PRODUCAO_STATUS.has(i.status));
  const valorEmProducao = emProducao.reduce(
    (s, i) => s + Number(i.valor_total || 0),
    0,
  );

  const faturadas = items.filter((i) => i.status === "faturado");
  const ticketFromList =
    faturadas.length > 0
      ? faturadas.reduce((s, i) => s + Number(i.valor_total || 0), 0) /
        faturadas.length
      : 0;

  const finalizadasFromItems = items.filter(
    (i) => i.data_conclusao != null && i.data_conclusao.slice(0, 10) === hoje,
  ).length;

  const entreguesFromItems = items.filter((i) => {
    if (!i.aceite_entrega_em) return false;
    return i.aceite_entrega_em.slice(0, 10) === hoje;
  }).length;

  return {
    abertas,
    emDiagnostico: count("aguardando_diagnostico", "diagnostico_concluido"),
    aguardandoAprovacao: count("aguardando_aprovacao"),
    aguardandoPecas: count("aguardando_peca"),
    emExecucao: count("em_execucao", "aprovado", "parcialmente_aprovado"),
    finalizadasHoje: opts?.finalizadasHoje ?? finalizadasFromItems,
    entreguesHoje:
      opts?.entreguesHoje === undefined
        ? entreguesFromItems
        : opts.entreguesHoje,
    atrasadas,
    ticketMedio:
      opts?.ticketMedio != null && Number.isFinite(opts.ticketMedio)
        ? opts.ticketMedio
        : ticketFromList,
    valorEmProducao,
  };
}

export function buildOsCentralPagination(input: {
  page: number;
  perPage: number;
  total: number;
}): OsCentralPagination {
  const perPage = input.perPage > 0 ? input.perPage : 25;
  const total = Math.max(0, input.total);
  const totalPages = Math.max(1, Math.ceil(total / perPage) || 1);
  const page = Math.min(Math.max(1, input.page), totalPages);
  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = total === 0 ? 0 : Math.min(page * perPage, total);
  return {
    page,
    perPage,
    total,
    totalPages,
    from,
    to,
    hasNext: page < totalPages,
    hasPrev: page > 1,
    label:
      total === 0
        ? "Exibindo 0–0 de 0 registros"
        : `Exibindo ${from}–${to} de ${total} registros`,
  };
}

export function filterOsCentralRows(
  rows: OsCentralRow[],
  filters: {
    prioridade?: string;
    cliente?: string;
    veiculo?: string;
    q?: string;
  },
): OsCentralRow[] {
  let out = rows;
  if (filters.prioridade && filters.prioridade !== "all") {
    out = out.filter((r) => r.prioridade === filters.prioridade);
  }
  const cliente = filters.cliente?.trim().toLowerCase();
  if (cliente) {
    out = out.filter((r) =>
      (r.cliente_nome ?? "").toLowerCase().includes(cliente),
    );
  }
  const veiculo = filters.veiculo?.trim().toLowerCase();
  if (veiculo) {
    out = out.filter(
      (r) =>
        (r.placa ?? "").toLowerCase().includes(veiculo) ||
        (r.modelo ?? "").toLowerCase().includes(veiculo),
    );
  }
  const q = filters.q?.trim().toLowerCase();
  if (q) {
    out = out.filter(
      (r) =>
        String(r.numero).includes(q) ||
        (r.cliente_nome ?? "").toLowerCase().includes(q) ||
        (r.placa ?? "").toLowerCase().includes(q) ||
        (r.modelo ?? "").toLowerCase().includes(q) ||
        r.responsavel.nome.toLowerCase().includes(q),
    );
  }
  return out;
}

export function sortOsCentralRows(
  rows: OsCentralRow[],
  sort: OsCentralSort,
  hoje = isoToday(),
): OsCentralRow[] {
  const copy = rows.slice();
  const diasAtraso = (r: OsCentralRow) => {
    const dia = previsaoDia(r.previsao_entrega);
    if (!dia || !r.atrasada) return -1;
    return Math.max(
      0,
      Math.round(
        (new Date(`${hoje}T00:00:00`).getTime() -
          new Date(`${dia}T00:00:00`).getTime()) /
          (1000 * 60 * 60 * 24),
      ),
    );
  };

  switch (sort) {
    case "mais_atrasadas":
      return copy.sort((a, b) => {
        if (a.atrasada !== b.atrasada) return a.atrasada ? -1 : 1;
        return diasAtraso(b) - diasAtraso(a) || b.numero - a.numero;
      });
    case "maior_valor":
      return copy.sort(
        (a, b) => b.valor_total - a.valor_total || b.numero - a.numero,
      );
    case "mais_antigas":
      return copy.sort((a, b) =>
        a.data_abertura === b.data_abertura
          ? a.numero - b.numero
          : a.data_abertura.localeCompare(b.data_abertura),
      );
    case "previstas_hoje":
      return copy.sort((a, b) => {
        if (a.previstaHoje !== b.previstaHoje) return a.previstaHoje ? -1 : 1;
        if (a.atrasada !== b.atrasada) return a.atrasada ? -1 : 1;
        return b.numero - a.numero;
      });
    case "maior_prioridade":
      return copy.sort((a, b) => {
        const ra = PRIORIDADE_RANK[a.prioridade] ?? 0;
        const rb = PRIORIDADE_RANK[b.prioridade] ?? 0;
        return rb - ra || b.numero - a.numero;
      });
    default:
      return copy;
  }
}

export function resolveOsCentralSort(raw?: string): OsCentralSort {
  if (raw === "entrega_hoje") return "previstas_hoje";
  if (
    raw === "mais_atrasadas" ||
    raw === "maior_valor" ||
    raw === "mais_antigas" ||
    raw === "previstas_hoje" ||
    raw === "maior_prioridade"
  ) {
    return raw;
  }
  return "mais_atrasadas";
}

export function hasOsCentralFilters(filters: OsCentralFilters): boolean {
  return Boolean(
    filters.de ||
      filters.ate ||
      (filters.status && filters.status !== "all") ||
      filters.q?.trim() ||
      filters.mecanico_id ||
      (filters.prioridade && filters.prioridade !== "all") ||
      filters.cliente?.trim() ||
      filters.veiculo?.trim() ||
      (filters.sort &&
        filters.sort !== "mais_atrasadas" &&
        filters.sort !== "entrega_hoje") ||
      filters.incluir_arquivadas,
  );
}

export function osCentralClearHref(tenantSlug: string) {
  return `/${tenantSlug}/ordens`;
}

export function osCentralHref(
  tenantSlug: string,
  params: Record<string, string | number | undefined | null>,
) {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === "" || value === "all") continue;
    qs.set(key, String(value));
  }
  const s = qs.toString();
  return s ? `/${tenantSlug}/ordens?${s}` : `/${tenantSlug}/ordens`;
}

export const OS_CENTRAL_PER_PAGE_OPTIONS = [25, 50, 100] as const;

export const OS_CENTRAL_SORT_OPTIONS: {
  value: OsCentralSort;
  label: string;
}[] = [
  { value: "mais_atrasadas", label: "Mais atrasadas" },
  { value: "maior_valor", label: "Maior valor" },
  { value: "mais_antigas", label: "Mais antigas" },
  { value: "previstas_hoje", label: "Previstas para hoje" },
  { value: "maior_prioridade", label: "Maior prioridade" },
];
