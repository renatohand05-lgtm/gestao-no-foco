import "server-only";

/**
 * Sprint 31.3 — Compose Financeiro Mobile.
 * Orquestra ContaPagar/Receber, FluxoCaixa, DreService — sem novas fórmulas.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { formatCurrencyCompact, formatPercent } from "@/lib/dashboard/format";
import { ContaPagarService } from "@/lib/financeiro/conta-pagar-service";
import { ContaReceberService } from "@/lib/financeiro/conta-receber-service";
import {
  DreService,
  defaultDrePeriodo,
} from "@/lib/financeiro/dre-service";
import {
  FluxoCaixaService,
  defaultFluxoCaixaPeriodo,
} from "@/lib/financeiro/fluxo-caixa-service";
import { createAdminClient, isAdminClientAvailable } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";
import type { ContaPagarListItem, ContasPagarResumo } from "@/types/contas-pagar";
import type {
  ContaReceberListItem,
  ContasReceberResumo,
} from "@/types/contas-receber";
import type { DreResumo } from "@/types/dre";
import type { FluxoCaixaResumo, FluxoCaixaDailyPoint } from "@/types/fluxo-caixa";

export function resolveFinanceDataClient(
  userClient: SupabaseClient<Database>,
): SupabaseClient<Database> {
  if (isAdminClientAvailable()) return createAdminClient();
  return userClient;
}

async function soft<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

function hasPerm(permissions: readonly string[], key: string): boolean {
  return permissions.includes("*") || permissions.includes(key);
}

export function canViewFinance(permissions: readonly string[]): boolean {
  return (
    hasPerm(permissions, "financeiro.visualizar") ||
    hasPerm(permissions, "financeiro.ver_saldos") ||
    hasPerm(permissions, "financeiro.ver_fluxo_caixa") ||
    hasPerm(permissions, "financeiro.ver_dre")
  );
}

export type MobileFinanceAlert = {
  id: string;
  title: string;
  description: string;
  priority: "critica" | "alta" | "media" | "baixa";
  category: string;
  href: string | null;
};

export type MobileFinanceSummary = {
  generatedAt: string;
  period: { dataDe: string; dataAte: string };
  updatedAtLabel: string;
  saldoAtual: string | null;
  entradasPrevistas: string | null;
  saidasPrevistas: string | null;
  saldoProjetado: string | null;
  contasReceberAberto: string | null;
  contasPagarAberto: string | null;
  vencidoReceber: string | null;
  vencidoPagar: string | null;
  receitaPeriodo: string | null;
  despesaPeriodo: string | null;
  resultado: string | null;
  margem: string | null;
  unavailable: string[];
  alerts: MobileFinanceAlert[];
  quickActions: Array<{
    id: string;
    label: string;
    href: string;
    permission: string | null;
    enabled: boolean;
    opensWeb: boolean;
  }>;
};

export type MobileFinanceListItem = {
  id: string;
  title: string;
  subtitle: string;
  amount: string;
  dueDate: string;
  status: string;
  overdue: boolean;
  parcelLabel: string | null;
};

export async function composeFinanceSummary(input: {
  client: SupabaseClient<Database>;
  tenantId: string;
  tenantSlug: string;
  permissions: readonly string[];
}): Promise<MobileFinanceSummary> {
  if (!canViewFinance(input.permissions)) {
    throw new Error("FORBIDDEN_FINANCE");
  }

  const period = defaultFluxoCaixaPeriodo();
  const drePeriod = defaultDrePeriodo();
  const client = resolveFinanceDataClient(input.client);

  const pagarSvc = new ContaPagarService(client, input.tenantId);
  const receberSvc = new ContaReceberService(client, input.tenantId);
  const fluxoSvc = new FluxoCaixaService(client, input.tenantId);
  const dreSvc = new DreService(client, input.tenantId);

  const [pagar, receber, fluxo, dre] = await Promise.all([
    soft(() => pagarSvc.getResumo()),
    soft(() => receberSvc.getResumo()),
    soft(() =>
      fluxoSvc.getFluxo({
        dataDe: period.dataDe,
        dataAte: period.dataAte,
        includeItens: false,
      }),
    ),
    soft(() => dreSvc.getDre(drePeriod)),
  ]);

  const unavailable: string[] = [];
  if (!pagar) unavailable.push("contas_pagar");
  if (!receber) unavailable.push("contas_receber");
  if (!fluxo) unavailable.push("fluxo_caixa");
  if (!dre) unavailable.push("dre");

  const resumo = fluxo?.resumo ?? null;
  const dreResumo = dre?.resumo ?? null;

  const alerts = buildFinanceAlerts({
    pagar,
    receber,
    fluxo: resumo,
    tenantSlug: input.tenantSlug,
  });

  const root = `/${input.tenantSlug}`;
  const can = (p: string | null) => !p || hasPerm(input.permissions, p);

  return {
    generatedAt: new Date().toISOString(),
    period: { dataDe: period.dataDe, dataAte: period.dataAte },
    updatedAtLabel: new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date()),
    saldoAtual:
      resumo?.saldo_atual != null
        ? formatCurrencyCompact(resumo.saldo_atual)
        : null,
    entradasPrevistas:
      resumo != null ? formatCurrencyCompact(resumo.entradas_previstas) : null,
    saidasPrevistas:
      resumo != null ? formatCurrencyCompact(resumo.saidas_previstas) : null,
    saldoProjetado:
      resumo?.saldo_projetado != null
        ? formatCurrencyCompact(resumo.saldo_projetado)
        : null,
    contasReceberAberto:
      receber != null ? formatCurrencyCompact(receber.total_aberto) : null,
    contasPagarAberto:
      pagar != null ? formatCurrencyCompact(pagar.total_aberto) : null,
    vencidoReceber:
      receber != null ? formatCurrencyCompact(receber.total_vencido) : null,
    vencidoPagar:
      pagar != null ? formatCurrencyCompact(pagar.total_vencido) : null,
    receitaPeriodo:
      dreResumo != null
        ? formatCurrencyCompact(dreResumo.receita_liquida)
        : null,
    despesaPeriodo:
      dreResumo != null
        ? formatCurrencyCompact(dreResumo.despesas_operacionais)
        : null,
    resultado:
      dreResumo != null
        ? formatCurrencyCompact(dreResumo.resultado_final)
        : null,
    margem:
      dreResumo != null && dreResumo.receita_liquida > 0
        ? formatPercent(
            (dreResumo.resultado_final / dreResumo.receita_liquida) * 100,
          )
        : null,
    unavailable,
    alerts,
    quickActions: [
      {
        id: "pagar",
        label: "Contas a pagar",
        href: "/financeiro/contas-pagar",
        permission: "financeiro.visualizar",
        enabled: can("financeiro.visualizar"),
        opensWeb: false,
      },
      {
        id: "receber",
        label: "Contas a receber",
        href: "/financeiro/contas-receber",
        permission: "financeiro.visualizar",
        enabled: can("financeiro.visualizar"),
        opensWeb: false,
      },
      {
        id: "fluxo",
        label: "Fluxo de caixa",
        href: "/financeiro/fluxo-caixa",
        permission: "financeiro.ver_fluxo_caixa",
        enabled: can("financeiro.ver_fluxo_caixa") || can("financeiro.visualizar"),
        opensWeb: false,
      },
      {
        id: "dre",
        label: "DRE",
        href: "/financeiro/dre",
        permission: "financeiro.ver_dre",
        enabled: can("financeiro.ver_dre") || can("financeiro.visualizar"),
        opensWeb: false,
      },
      {
        id: "aprovacoes",
        label: "Aprovações",
        href: "/financeiro/aprovacoes",
        permission: "financeiro.aprovar",
        enabled: can("financeiro.aprovar") || can("financeiro.visualizar"),
        opensWeb: false,
      },
      {
        id: "web",
        label: "Abrir financeiro web",
        href: `${root}/financeiro`,
        permission: "financeiro.visualizar",
        enabled: can("financeiro.visualizar"),
        opensWeb: true,
      },
    ],
  };
}

function buildFinanceAlerts(input: {
  pagar: ContasPagarResumo | null;
  receber: ContasReceberResumo | null;
  fluxo: FluxoCaixaResumo | null;
  tenantSlug: string;
}): MobileFinanceAlert[] {
  const alerts: MobileFinanceAlert[] = [];
  const root = `/${input.tenantSlug}/financeiro`;

  if (input.pagar && input.pagar.total_vencido > 0) {
    alerts.push({
      id: "pagar-vencido",
      title: "Contas a pagar vencidas",
      description: `${formatCurrencyCompact(input.pagar.total_vencido)} em atraso (${input.pagar.quantidade_vencido} título(s)).`,
      priority: "critica",
      category: "pagar",
      href: `${root}/contas-pagar`,
    });
  }
  if (input.receber && input.receber.total_vencido > 0) {
    alerts.push({
      id: "receber-vencido",
      title: "Contas a receber vencidas",
      description: `${formatCurrencyCompact(input.receber.total_vencido)} em atraso (${input.receber.quantidade_vencido} título(s)).`,
      priority: "alta",
      category: "receber",
      href: `${root}/contas-receber`,
    });
  }
  if (input.fluxo && input.fluxo.saldo_projetado != null && input.fluxo.saldo_projetado < 0) {
    alerts.push({
      id: "caixa-negativo",
      title: "Caixa projetado negativo",
      description: `Saldo projetado ${formatCurrencyCompact(input.fluxo.saldo_projetado)}.`,
      priority: "critica",
      category: "caixa",
      href: `${root}/fluxo-caixa`,
    });
  }
  return alerts;
}

function mapPagarItem(row: ContaPagarListItem): MobileFinanceListItem {
  const overdue = row.status_exibicao === "vencido";
  return {
    id: row.id,
    title: row.descricao,
    subtitle: row.fornecedor?.nome ?? row.fornecedor_nome ?? "Sem fornecedor",
    amount: formatCurrencyCompact(
      Math.max(0, row.valor_original - row.desconto + row.juros + row.multa - row.valor_pago),
    ),
    dueDate: row.data_vencimento,
    status: row.status_exibicao,
    overdue,
    parcelLabel:
      row.parcela_total > 1
        ? `${row.parcela_numero}/${row.parcela_total}`
        : null,
  };
}

function mapReceberItem(row: ContaReceberListItem): MobileFinanceListItem {
  const overdue = row.status_exibicao === "vencido";
  return {
    id: row.id,
    title: row.descricao,
    subtitle: row.cliente?.nome ?? "Sem cliente",
    amount: formatCurrencyCompact(
      Math.max(0, row.valor_original - row.desconto + row.juros + row.multa - row.valor_recebido),
    ),
    dueDate: row.data_vencimento,
    status: row.status_exibicao,
    overdue,
    parcelLabel:
      row.parcela_total > 1
        ? `${row.parcela_numero}/${row.parcela_total}`
        : null,
  };
}

export async function composeAccountsPayable(input: {
  client: SupabaseClient<Database>;
  tenantId: string;
  permissions: readonly string[];
  status?: string;
  page?: number;
}): Promise<{
  resumo: ContasPagarResumo | null;
  items: MobileFinanceListItem[];
  page: number;
  total: number;
}> {
  if (!hasPerm(input.permissions, "financeiro.visualizar")) {
    throw new Error("FORBIDDEN_FINANCE");
  }
  const client = resolveFinanceDataClient(input.client);
  const svc = new ContaPagarService(client, input.tenantId);
  const page = Math.max(1, input.page ?? 1);
  const [resumo, list] = await Promise.all([
    soft(() => svc.getResumo()),
    svc.list({
      page,
      perPage: 30,
      status:
        input.status === "aberto" ||
        input.status === "pago" ||
        input.status === "vencido" ||
        input.status === "cancelado" ||
        input.status === "parcial"
          ? input.status
          : undefined,
      sort: "data_vencimento",
      order: "asc",
    }),
  ]);
  return {
    resumo,
    items: list.data.map(mapPagarItem),
    page: list.page,
    total: list.total,
  };
}

export async function composeAccountsReceivable(input: {
  client: SupabaseClient<Database>;
  tenantId: string;
  permissions: readonly string[];
  status?: string;
  page?: number;
}): Promise<{
  resumo: ContasReceberResumo | null;
  items: MobileFinanceListItem[];
  page: number;
  total: number;
}> {
  if (!hasPerm(input.permissions, "financeiro.visualizar")) {
    throw new Error("FORBIDDEN_FINANCE");
  }
  const client = resolveFinanceDataClient(input.client);
  const svc = new ContaReceberService(client, input.tenantId);
  const page = Math.max(1, input.page ?? 1);
  const [resumo, list] = await Promise.all([
    soft(() => svc.getResumo()),
    svc.list({
      page,
      perPage: 30,
      status:
        input.status === "aberto" ||
        input.status === "recebido" ||
        input.status === "vencido" ||
        input.status === "cancelado"
          ? input.status
          : undefined,
      sort: "data_vencimento",
      order: "asc",
    }),
  ]);
  return {
    resumo,
    items: list.data.map(mapReceberItem),
    page: list.page,
    total: list.total,
  };
}

export type MobileCashFlow = {
  period: { dataDe: string; dataAte: string };
  resumo: {
    saldoInicial: string | null;
    entradas: string | null;
    saidas: string | null;
    saldoFinal: string | null;
    saldoProjetado: string | null;
    saldoAtual: string | null;
  };
  daily: Array<{ date: string; entradas: string; saidas: string; saldo: string }>;
  unavailable: boolean;
};

export async function composeCashFlow(input: {
  client: SupabaseClient<Database>;
  tenantId: string;
  permissions: readonly string[];
}): Promise<MobileCashFlow> {
  if (
    !hasPerm(input.permissions, "financeiro.ver_fluxo_caixa") &&
    !hasPerm(input.permissions, "financeiro.visualizar")
  ) {
    throw new Error("FORBIDDEN_FINANCE");
  }
  const period = defaultFluxoCaixaPeriodo();
  const client = resolveFinanceDataClient(input.client);
  const svc = new FluxoCaixaService(client, input.tenantId);
  const result = await soft(() =>
    svc.getFluxo({
      dataDe: period.dataDe,
      dataAte: period.dataAte,
      includeItens: false,
    }),
  );
  const r = result?.resumo ?? null;
  const daily = (result?.daily ?? []).slice(-14).map((d: FluxoCaixaDailyPoint) => ({
    date: d.data,
    entradas: formatCurrencyCompact(d.entradas),
    saidas: formatCurrencyCompact(d.saidas),
    saldo: formatCurrencyCompact(d.saldo_acumulado),
  }));
  return {
    period,
    resumo: {
      saldoInicial: r != null ? formatCurrencyCompact(r.saldo_inicial) : null,
      entradas: r != null ? formatCurrencyCompact(r.entradas_previstas + r.entradas_realizadas) : null,
      saidas: r != null ? formatCurrencyCompact(r.saidas_previstas + r.saidas_realizadas) : null,
      saldoFinal: r != null ? formatCurrencyCompact(r.saldo_acumulado) : null,
      saldoProjetado:
        r?.saldo_projetado != null
          ? formatCurrencyCompact(r.saldo_projetado)
          : null,
      saldoAtual:
        r?.saldo_atual != null ? formatCurrencyCompact(r.saldo_atual) : null,
    },
    daily,
    unavailable: !result,
  };
}

export type MobileDreSummary = {
  period: { dataDe: string; dataAte: string };
  lines: Array<{ id: string; label: string; value: string; emphasis?: boolean }>;
  unavailable: boolean;
};

export async function composeDreMobile(input: {
  client: SupabaseClient<Database>;
  tenantId: string;
  permissions: readonly string[];
}): Promise<MobileDreSummary> {
  if (
    !hasPerm(input.permissions, "financeiro.ver_dre") &&
    !hasPerm(input.permissions, "financeiro.visualizar")
  ) {
    throw new Error("FORBIDDEN_FINANCE");
  }
  const period = defaultDrePeriodo();
  const client = resolveFinanceDataClient(input.client);
  const svc = new DreService(client, input.tenantId);
  const result = await soft(() => svc.getDre(period));
  const r: DreResumo | null = result?.resumo ?? null;
  if (!r) {
    return { period, lines: [], unavailable: true };
  }
  return {
    period,
    unavailable: false,
    lines: [
      { id: "receita_bruta", label: "Receita bruta", value: formatCurrencyCompact(r.receita_bruta) },
      { id: "deducoes", label: "Deduções", value: formatCurrencyCompact(r.deducoes) },
      {
        id: "receita_liquida",
        label: "Receita líquida",
        value: formatCurrencyCompact(r.receita_liquida),
        emphasis: true,
      },
      { id: "cmv", label: "CMV/CPV/CSP", value: formatCurrencyCompact(r.cmv) },
      {
        id: "margem",
        label: "Margem de contribuição",
        value: formatCurrencyCompact(r.margem_contribuicao),
      },
      {
        id: "opex",
        label: "Despesas operacionais",
        value: formatCurrencyCompact(r.despesas_operacionais),
      },
      { id: "ebitda", label: "EBITDA", value: formatCurrencyCompact(r.ebitda) },
      {
        id: "resultado",
        label: "Resultado líquido",
        value: formatCurrencyCompact(r.resultado_final),
        emphasis: true,
      },
    ],
  };
}

export type MobileApprovalList = {
  available: boolean;
  message: string;
  items: Array<{
    id: string;
    title: string;
    status: string;
    amountLabel: string | null;
    requester: string | null;
  }>;
  webHref: string;
};

/** Aprovações: painel honesto — runtime completo permanece na web nesta sprint. */
export async function composeFinanceApprovals(input: {
  tenantSlug: string;
  permissions: readonly string[];
}): Promise<MobileApprovalList> {
  const canSee =
    hasPerm(input.permissions, "financeiro.aprovar") ||
    hasPerm(input.permissions, "financeiro.visualizar");
  if (!canSee) throw new Error("FORBIDDEN_FINANCE");

  return {
    available: false,
    message:
      "Aprovações financeiras usam o runtime enterprise na web. Abra pelo atalho para decidir com segurança.",
    items: [],
    webHref: `/${input.tenantSlug}/aprovacoes/runtime`,
  };
}

export async function composeFinanceDetail(input: {
  client: SupabaseClient<Database>;
  tenantId: string;
  permissions: readonly string[];
  kind: "pagar" | "receber";
  id: string;
}): Promise<{
  kind: string;
  id: string;
  title: string;
  fields: Array<{ label: string; value: string }>;
} | null> {
  if (!hasPerm(input.permissions, "financeiro.visualizar")) {
    throw new Error("FORBIDDEN_FINANCE");
  }
  const client = resolveFinanceDataClient(input.client);
  if (input.kind === "pagar") {
    const svc = new ContaPagarService(client, input.tenantId);
    const row = await soft(() => svc.getById(input.id));
    if (!row) return null;
    return {
      kind: "pagar",
      id: row.id,
      title: row.descricao,
      fields: [
        { label: "Fornecedor", value: row.fornecedor?.nome ?? row.fornecedor_nome ?? "—" },
        { label: "Status", value: row.status_exibicao },
        { label: "Valor original", value: formatCurrencyCompact(row.valor_original) },
        { label: "Pago", value: formatCurrencyCompact(row.valor_pago) },
        { label: "Vencimento", value: row.data_vencimento },
        { label: "Emissão", value: row.data_emissao },
        {
          label: "Parcela",
          value:
            row.parcela_total > 1
              ? `${row.parcela_numero}/${row.parcela_total}`
              : "Única",
        },
        { label: "Observações", value: row.observacoes?.trim() || "—" },
      ],
    };
  }

  const svc = new ContaReceberService(client, input.tenantId);
  const row = await soft(() => svc.getById(input.id));
  if (!row) return null;
  return {
    kind: "receber",
    id: row.id,
    title: row.descricao,
    fields: [
      { label: "Cliente", value: row.cliente?.nome ?? "—" },
      { label: "Status", value: row.status_exibicao },
      { label: "Valor original", value: formatCurrencyCompact(row.valor_original) },
      { label: "Recebido", value: formatCurrencyCompact(row.valor_recebido) },
      { label: "Vencimento", value: row.data_vencimento },
      { label: "Emissão", value: row.data_emissao },
      {
        label: "Parcela",
        value:
          row.parcela_total > 1
            ? `${row.parcela_numero}/${row.parcela_total}`
            : "Única",
      },
      { label: "Observações", value: row.observacoes?.trim() || "—" },
    ],
  };
}
