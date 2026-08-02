/**
 * Fase 28.1 — Inbox de leads (visão sobre clientes.estagio_funil = lead).
 * Não cria tabela leads.
 */

export type LeadInboxRow = {
  id: string;
  nome: string;
  empresa: string | null;
  telefone: string | null;
  email: string | null;
  origem: string | null;
  segmento: string | null;
  responsavelId: string | null;
  responsavelNome: string | null;
  status: string;
  prioridade: string | null;
  score: number | null;
  valorPotencial: number | null;
  proximaAcao: string | null;
  dataProximaAcao: string | null;
  tags: string[];
};

export type LeadInboxFilters = {
  responsavelId?: string | null;
  origem?: string | null;
  prioridade?: string | null;
  somenteSemRetorno?: boolean;
  q?: string | null;
};

export function filterLeadInbox(
  rows: LeadInboxRow[],
  filters: LeadInboxFilters = {},
): LeadInboxRow[] {
  const q = filters.q?.trim().toLowerCase() ?? "";
  return rows.filter((row) => {
    if (filters.responsavelId && row.responsavelId !== filters.responsavelId) {
      return false;
    }
    if (filters.origem && (row.origem ?? "") !== filters.origem) return false;
    if (filters.prioridade && (row.prioridade ?? "") !== filters.prioridade) {
      return false;
    }
    if (filters.somenteSemRetorno && row.dataProximaAcao) return false;
    if (!q) return true;
    const hay = [row.nome, row.empresa, row.email, row.telefone, row.origem]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}

export function summarizeLeadInbox(rows: LeadInboxRow[]): {
  ativos: number;
  valorPotencial: number;
  semProximaAcao: number;
  altaPrioridade: number;
} {
  return {
    ativos: rows.length,
    valorPotencial: rows.reduce((s, r) => s + (r.valorPotencial ?? 0), 0),
    semProximaAcao: rows.filter((r) => !r.dataProximaAcao).length,
    altaPrioridade: rows.filter(
      (r) => r.prioridade === "alta" || r.prioridade === "critica",
    ).length,
  };
}

/** Conversão lead → cliente comercial: avança estágio sem duplicar cadastro. */
export function nextStageAfterLeadConversion(
  current: string,
): "contato" | "proposta" {
  if (current === "lead") return "contato";
  return "proposta";
}

const ORIGEM_LABELS: Record<string, string> = {
  ordem_de_servico: "Ordem de serviço",
  indicacao: "Indicação",
  indicação: "Indicação",
  site: "Site",
  whatsapp: "WhatsApp",
  telefone: "Telefone",
  email: "E-mail",
  balcao: "Balcão",
  campanha: "Campanha",
  organico: "Orgânico",
  outro: "Outro",
};

const PRIORIDADE_LABELS: Record<string, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  critica: "Crítica",
  urgente: "Urgente",
};

/** Labels amigáveis — nunca exibir snake_case cru na UI. */
export function labelOrigemCrm(origem: string | null | undefined): string {
  if (!origem?.trim()) return "—";
  const key = origem.trim().toLowerCase();
  return ORIGEM_LABELS[key] ?? humanizeToken(origem);
}

export function labelPrioridadeCrm(
  prioridade: string | null | undefined,
): string {
  if (!prioridade?.trim()) return "—";
  const key = prioridade.trim().toLowerCase();
  return PRIORIDADE_LABELS[key] ?? humanizeToken(prioridade);
}

function humanizeToken(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase());
}
