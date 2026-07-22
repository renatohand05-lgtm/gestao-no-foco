/**
 * Regras determinísticas do Centro de Decisão (Gate 16.2).
 * Pure — sem I/O. Só usa campos já disponíveis nos feeds.
 */

import type {
  DecisionSeverity,
  ExecutiveDecisionItem,
  ExecutiveDecisionResult,
  ExecutiveDecisionSummary,
} from "./executive-decision-types";

/** Espelha calcProjecaoFechamento (resumo-vendas-mes) — sem import ESM no runner de testes. */
function calcProjecaoFechamento(input: {
  realizadoAcumulado: number;
  diasDecorridos: number;
  diasTotais: number;
}): number | null {
  if (input.diasDecorridos <= 0) return null;
  return (input.realizadoAcumulado / input.diasDecorridos) * input.diasTotais;
}

const SEVERITY_BASE: Record<DecisionSeverity, number> = {
  critical: 100,
  warning: 70,
  opportunity: 50,
  info: 20,
};

export type DecisionHojeInput = {
  meta: number | null;
  faturamento: number;
  percentual: number | null;
  dataHoje: string;
};

export type DecisionMesInput = {
  metaMensal: number | null;
  realizadoAcumulado: number;
  diasDecorridos: number;
  diasTotais: number;
  projecaoFechamento?: number | null;
};

export type DecisionOficinaInput = {
  aguardandoAprovacao: number;
  aguardandoPecas: number;
  aguardandoOrcamento: number;
  atrasadas: number;
  semAtualizacao: number;
  /** Maior horas sem update (quando conhecido). */
  maxHorasParada?: number | null;
};

export type DecisionEstoqueInput = {
  abaixoMinimo: number;
  zerados: number;
};

export type DecisionFinanceiroInput = {
  pagarVencidoQtd: number;
  pagarVencidoValor: number;
  pagarVencendoHojeQtd: number;
  pagarVencendoHojeValor: number;
  receberVencidoQtd: number;
  receberVencidoValor: number;
};

export type DecisionRecursosInput = {
  totalAtivos: number;
  disponivel: number;
  ocupado: number;
  reservado: number;
  taxaOcupacao: number;
  /** Fila aproximada: OS em execução / aguardando peças (opcional). */
  filaOps?: number;
};

export type BuildDecisionInput = {
  tenantSlug: string;
  hoje: DecisionHojeInput;
  mes: DecisionMesInput;
  oficina?: DecisionOficinaInput | null;
  estoque?: DecisionEstoqueInput | null;
  financeiro?: DecisionFinanceiroInput | null;
  recursos?: DecisionRecursosInput | null;
  nowIso?: string;
};

function money(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function scoreOf(
  severity: DecisionSeverity,
  opts?: {
    impactValue?: number | null;
    overdue?: boolean;
    stale48h?: boolean;
    nearDayClose?: boolean;
  },
) {
  let score = SEVERITY_BASE[severity];
  const impact = opts?.impactValue ?? 0;
  if (impact >= 10000) score += 25;
  else if (impact >= 3000) score += 15;
  else if (impact >= 500) score += 8;
  if (opts?.overdue) score += 20;
  if (opts?.stale48h) score += 12;
  if (opts?.nearDayClose) score += 5;
  return score;
}

function nearDayCloseHour(now: Date) {
  // Heurística local: a partir das 16h (fechamento comercial).
  return now.getHours() >= 16;
}

export function buildDecisionSummary(
  items: ExecutiveDecisionItem[],
): ExecutiveDecisionSummary {
  const criticalCount = items.filter((i) => i.severity === "critical").length;
  const warningCount = items.filter((i) => i.severity === "warning").length;
  const opportunityCount = items.filter(
    (i) => i.severity === "opportunity",
  ).length;
  const infoCount = items.filter((i) => i.severity === "info").length;
  const totalCount = items.length;

  let headline = "Nenhum risco crítico identificado.";
  if (totalCount === 0) {
    headline = "Nenhum risco crítico identificado.";
  } else if (criticalCount === 1) {
    headline = "1 risco crítico pode impactar o resultado de hoje.";
  } else if (criticalCount > 1) {
    headline = `${criticalCount} riscos críticos exigem atenção agora.`;
  } else if (warningCount > 0 && opportunityCount > 0) {
    headline = `${warningCount + criticalCount} pontos exigem atenção agora.`;
  } else if (warningCount > 0) {
    headline = `${warningCount} pontos exigem atenção agora.`;
  } else if (opportunityCount > 0) {
    headline = `Operação estável, com ${opportunityCount} oportunidade${opportunityCount > 1 ? "s" : ""}.`;
  }

  return {
    headline,
    criticalCount,
    warningCount,
    opportunityCount,
    infoCount,
    totalCount,
  };
}

export function sortDecisionItems(
  items: ExecutiveDecisionItem[],
): ExecutiveDecisionItem[] {
  return items.slice().sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const impactA = a.impactValue ?? 0;
    const impactB = b.impactValue ?? 0;
    if (impactB !== impactA) return impactB - impactA;
    return a.id.localeCompare(b.id);
  });
}

/** Constrói itens a partir dos feeds — sem inventar dados. */
export function buildExecutiveDecisionItems(
  input: BuildDecisionInput,
): ExecutiveDecisionResult {
  const items: ExecutiveDecisionItem[] = [];
  const slug = input.tenantSlug;
  const now = input.nowIso ? new Date(input.nowIso) : new Date();
  const nearClose = nearDayCloseHour(now);
  const dataHoje = input.hoje.dataHoje;

  // A — Meta do dia
  const meta = input.hoje.meta;
  const realizado = input.hoje.faturamento;
  const pct = input.hoje.percentual;
  if (meta != null && meta > 0) {
    const falta = meta - realizado;
    if (pct != null && pct < 80) {
      items.push({
        id: "meta-dia-abaixo",
        title: "Meta do dia abaixo do ritmo",
        description: `Faltam ${money(Math.max(falta, 0))} para a meta de hoje (${pct.toFixed(0)}% atingido).`,
        severity: "warning",
        category: "metas",
        impactValue: Math.max(falta, 0),
        actionLabel: "Ver vendas",
        href: `/${slug}/vendas`,
        referenceDate: dataHoje,
        source: "vendas-dia",
        score: scoreOf("warning", {
          impactValue: Math.max(falta, 0),
          nearDayClose: nearClose,
        }),
      });
    } else if (pct != null && pct >= 100) {
      const acima = realizado - meta;
      items.push({
        id: "meta-dia-atingida",
        title: "Meta do dia atingida",
        description:
          acima > 0
            ? `Meta superada em ${money(acima)} (${pct.toFixed(0)}% atingido).`
            : `Meta do dia atingida (${pct.toFixed(0)}%).`,
        severity: "opportunity",
        category: "metas",
        impactValue: acima > 0 ? acima : 0,
        actionLabel: "Ver desempenho",
        href: `/${slug}/dashboard`,
        referenceDate: dataHoje,
        source: "vendas-dia",
        score: scoreOf("opportunity", { impactValue: acima }),
      });
    }
  }

  // B — Meta do mês / projeção
  const metaMes = input.mes.metaMensal;
  const proj =
    input.mes.projecaoFechamento ??
    calcProjecaoFechamento({
      realizadoAcumulado: input.mes.realizadoAcumulado,
      diasDecorridos: input.mes.diasDecorridos,
      diasTotais: input.mes.diasTotais,
    });
  if (metaMes != null && metaMes > 0 && proj != null && proj < metaMes) {
    const gap = metaMes - proj;
    items.push({
      id: "projecao-mes-abaixo",
      title: "Projeção mensal abaixo da meta",
      description: `Gap projetado de ${money(gap)} vs meta mensal.`,
      severity: "warning",
      category: "metas",
      impactValue: gap,
      actionLabel: "Ver vendas",
      href: `/${slug}/vendas`,
      referenceDate: dataHoje,
      source: "resumo-mes",
      score: scoreOf("warning", { impactValue: gap }),
    });
  }

  // C / D / J — Oficina
  const of = input.oficina;
  if (of) {
    if (of.aguardandoAprovacao > 0) {
      const sev: DecisionSeverity =
        of.aguardandoAprovacao >= 5 ? "critical" : "warning";
      items.push({
        id: "os-aguardando-aprovacao",
        title: "OS aguardando aprovação",
        description: `${of.aguardandoAprovacao} ordem${of.aguardandoAprovacao > 1 ? "ns" : ""} aguardando aprovação do cliente.`,
        severity: sev,
        category: "oficina",
        actionLabel: "Abrir OS",
        href: `/${slug}/ordens?status=aguardando_aprovacao`,
        referenceDate: dataHoje,
        source: "centro-operacoes",
        score: scoreOf(sev, {
          overdue: of.aguardandoAprovacao >= 3,
          stale48h: (of.maxHorasParada ?? 0) >= 48,
        }),
      });
    }

    if (of.atrasadas > 0 || of.semAtualizacao > 0 || of.aguardandoPecas > 0) {
      const sev: DecisionSeverity =
        of.atrasadas > 0 || (of.maxHorasParada ?? 0) >= 72
          ? "critical"
          : "warning";
      const partes: string[] = [];
      if (of.atrasadas > 0) partes.push(`${of.atrasadas} atrasada(s)`);
      if (of.aguardandoPecas > 0)
        partes.push(`${of.aguardandoPecas} aguardando peças`);
      if (of.semAtualizacao > 0)
        partes.push(`${of.semAtualizacao} sem atualização (>48h)`);
      if (of.maxHorasParada != null && of.maxHorasParada > 0) {
        partes.push(`maior tempo parado: ${of.maxHorasParada}h`);
      }
      items.push({
        id: "os-paradas",
        title: "OS paradas",
        description: partes.join(" · "),
        severity: sev,
        category: "oficina",
        actionLabel: "Ver oficina",
        href: `/${slug}/centro-operacoes`,
        referenceDate: dataHoje,
        source: "centro-operacoes",
        score: scoreOf(sev, {
          overdue: of.atrasadas > 0,
          stale48h: of.semAtualizacao > 0 || (of.maxHorasParada ?? 0) >= 48,
        }),
      });
    }

    if (of.aguardandoOrcamento > 0) {
      items.push({
        id: "orcamentos-recuperacao",
        title: "Orçamentos com potencial de recuperação",
        description: `${of.aguardandoOrcamento} OS em orçamento aguardando avanço.`,
        severity: "opportunity",
        category: "clientes",
        actionLabel: "Abrir CRM",
        href: `/${slug}/clientes`,
        referenceDate: dataHoje,
        source: "centro-operacoes",
        score: scoreOf("opportunity"),
      });
    }
  }

  // E — Estoque
  const est = input.estoque;
  if (est && (est.abaixoMinimo > 0 || est.zerados > 0)) {
    const total = est.abaixoMinimo + est.zerados;
    items.push({
      id: "estoque-critico",
      title: "Itens com estoque crítico",
      description: `${total} item${total > 1 ? "ns" : ""} abaixo do mínimo ou zerado${est.zerados > 0 ? ` (${est.zerados} zerado${est.zerados > 1 ? "s" : ""})` : ""}.`,
      severity: "warning",
      category: "estoque",
      actionLabel: "Ver estoque",
      href: `/${slug}/estoque`,
      referenceDate: dataHoje,
      source: "estoque-dashboard",
      score: scoreOf("warning", { overdue: est.zerados > 0 }),
    });
  }

  // F / G — Financeiro
  const fin = input.financeiro;
  if (fin) {
    if (fin.pagarVencidoQtd > 0 || fin.pagarVencendoHojeQtd > 0) {
      const vencido = fin.pagarVencidoQtd > 0;
      const sev: DecisionSeverity = vencido ? "critical" : "warning";
      const qtd = fin.pagarVencidoQtd + fin.pagarVencendoHojeQtd;
      const valor = fin.pagarVencidoValor + fin.pagarVencendoHojeValor;
      items.push({
        id: "contas-pagar-atencao",
        title: "Contas a pagar exigem atenção",
        description: `${qtd} conta${qtd > 1 ? "s" : ""} · ${money(valor)}${
          fin.pagarVencidoQtd > 0
            ? ` · ${fin.pagarVencidoQtd} vencida${fin.pagarVencidoQtd > 1 ? "s" : ""}`
            : " · vencendo hoje"
        }.`,
        severity: sev,
        category: "financeiro",
        impactValue: valor,
        actionLabel: "Abrir financeiro",
        href: `/${slug}/financeiro/contas-pagar`,
        referenceDate: dataHoje,
        source: "contas-pagar",
        score: scoreOf(sev, { impactValue: valor, overdue: vencido }),
      });
    }

    if (fin.receberVencidoQtd > 0) {
      items.push({
        id: "contas-receber-atraso",
        title: "Recebimentos em atraso",
        description: `${fin.receberVencidoQtd} recebível${fin.receberVencidoQtd > 1 ? "s" : ""} · ${money(fin.receberVencidoValor)}.`,
        severity: "warning",
        category: "financeiro",
        impactValue: fin.receberVencidoValor,
        actionLabel: "Ver recebimentos",
        href: `/${slug}/financeiro/contas-receber`,
        referenceDate: dataHoje,
        source: "contas-receber",
        score: scoreOf("warning", {
          impactValue: fin.receberVencidoValor,
          overdue: true,
        }),
      });
    }
  }

  // H — Recursos
  const rec = input.recursos;
  if (rec && rec.totalAtivos > 0) {
    const livres = rec.disponivel;
    const fila = rec.filaOps ?? 0;
    if (livres === 0 && (fila > 0 || rec.taxaOcupacao >= 100)) {
      items.push({
        id: "capacidade-limite",
        title: "Capacidade operacional no limite",
        description: `Ocupação ${rec.taxaOcupacao.toFixed(0)}% · ${rec.ocupado + rec.reservado}/${rec.totalAtivos} recursos${fila > 0 ? ` · fila ${fila}` : ""}.`,
        severity: fila > 0 ? "warning" : "info",
        category: "operacao",
        actionLabel: "Ver oficina",
        href: `/${slug}/centro-operacoes/recursos`,
        referenceDate: dataHoje,
        source: "recursos",
        score: scoreOf(fila > 0 ? "warning" : "info"),
      });
    }
  }

  const sorted = sortDecisionItems(items);
  return {
    items: sorted,
    summary: buildDecisionSummary(sorted),
    updatedAt: now.toISOString(),
  };
}
