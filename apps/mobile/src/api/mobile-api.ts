import { apiRequest } from "@/api/client";
import { getAccessToken } from "@/auth/secure-session";

export type MeResponse = {
  id: string;
  email: string;
  displayName: string;
};

export type MembershipItem = {
  tenantId: string;
  slug: string;
  name: string;
  role: string;
  segmentId: string | null;
  segmentVersion?: number | null;
  modules?: {
    dashboard: boolean;
    intelligence: boolean;
    crm: boolean;
    stock: boolean;
    ops: boolean;
    finance: boolean;
  } | null;
};

export type MembershipsResponse = {
  items: MembershipItem[];
};

export type BranchesResponse = {
  items: { id: string; name: string }[];
  allowContinueWithoutBranch: boolean;
  message?: string;
};

export type PermissionsResponse = {
  permissions: string[];
  role: string;
};

async function withToken<T>(path: string): Promise<Awaited<ReturnType<typeof apiRequest<T>>>> {
  const accessToken = await getAccessToken();
  return apiRequest<T>(path, {
    context: { accessToken },
    retry: true,
  });
}

export async function fetchMe() {
  return withToken<MeResponse>("api/mobile/v1/me");
}

export async function fetchMemberships() {
  return withToken<MembershipsResponse>("api/mobile/v1/memberships");
}

export async function fetchBranches(tenantId: string) {
  return withToken<BranchesResponse>(`api/mobile/v1/tenants/${tenantId}/branches`);
}

export async function fetchPermissions(tenantId: string) {
  return withToken<PermissionsResponse>(`api/mobile/v1/tenants/${tenantId}/permissions`);
}

export async function postLogout() {
  const accessToken = await getAccessToken();
  return apiRequest<{ ok: boolean; message: string }>("api/mobile/v1/auth/logout", {
    method: "POST",
    context: { accessToken },
  });
}

export type MobileExecutiveDashboard = {
  generatedAt: string;
  greeting: string;
  welcome: string;
  user: { displayName: string | null; initials: string };
  context: {
    tenantId: string;
    tenantSlug: string;
    tenantName: string;
    branchId: string | null;
    branchName: string | null;
    segment: string | null;
  };
  clock: { timeLabel: string; dateLabel: string; timezone: string };
  kpis: {
    id: string;
    title: string;
    value: string;
    supportingText: string;
    tone: string;
    trendLabel: string | null;
    unavailable: boolean;
  }[];
  brief: {
    day: { label: string; value: string; detail: string; available: boolean };
    week: { label: string; value: string; detail: string; available: boolean };
    month: { label: string; value: string; detail: string; available: boolean };
    topAlerts: { id: string; title: string; priority: string; category: string }[];
    biggestOpportunity: { title: string; body: string; href: string } | null;
    biggestRisk: { title: string; body: string; href: string } | null;
    nextAction: { label: string; href: string; reason: string };
  };
  decision: {
    summary: {
      headline: string;
      criticalCount: number;
      warningCount: number;
      opportunityCount: number;
      infoCount: number;
      totalCount: number;
    };
    items: {
      id: string;
      title: string;
      description: string;
      severity: string;
      category: string;
      actionLabel: string | null;
      href: string | null;
      source: string;
    }[];
  };
  alerts: {
    id: string;
    title: string;
    description: string;
    impact: string;
    suggestedAction: string;
    href: string;
    priority: string;
    category: string;
    source: string;
  }[];
  metas: {
    month: {
      meta: string;
      realizado: string;
      pct: string;
      projecao: string;
      diasRestantes: string;
      valorRestante: string;
      tone: string;
      available: boolean;
    };
    day: {
      label: string;
      meta: string;
      realizado: string;
      pct: string;
      available: boolean;
    };
    week: {
      label: string;
      meta: string;
      realizado: string;
      pct: string;
      available: boolean;
    };
  };
  quickActions: {
    id: string;
    label: string;
    href: string;
    permission: string | null;
    enabled: boolean;
  }[];
  updatedAtLabel: string;
};

export async function fetchExecutiveDashboard(input: {
  tenantId: string;
  branchId?: string | null;
  branchName?: string | null;
}) {
  const accessToken = await getAccessToken();
  const headers: Record<string, string> = {};
  if (input.branchName) headers["x-gof-branch-name"] = input.branchName;
  return apiRequest<MobileExecutiveDashboard>(
    `api/mobile/v1/tenants/${input.tenantId}/dashboard`,
    {
      context: {
        accessToken,
        tenantId: input.tenantId,
        branchId: input.branchId,
      },
      headers,
      retry: true,
    },
  );
}

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
  alerts: {
    id: string;
    title: string;
    description: string;
    priority: string;
    category: string;
    href: string | null;
  }[];
  quickActions: {
    id: string;
    label: string;
    href: string;
    permission: string | null;
    enabled: boolean;
    opensWeb: boolean;
  }[];
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

export type MobileFinanceListResponse = {
  resumo: Record<string, number> | null;
  items: MobileFinanceListItem[];
  page: number;
  total: number;
};

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
  daily: { date: string; entradas: string; saidas: string; saldo: string }[];
  unavailable: boolean;
};

export type MobileDreSummary = {
  period: { dataDe: string; dataAte: string };
  lines: { id: string; label: string; value: string; emphasis?: boolean }[];
  unavailable: boolean;
};

export type MobileApprovalList = {
  available: boolean;
  message: string;
  items: {
    id: string;
    title: string;
    status: string;
    amountLabel: string | null;
    requester: string | null;
  }[];
  webHref: string;
};

export type MobileFinanceDetail = {
  kind: string;
  id: string;
  title: string;
  fields: { label: string; value: string }[];
};

async function financeGet<T>(
  tenantId: string,
  path: string,
  branchId?: string | null,
) {
  const accessToken = await getAccessToken();
  return apiRequest<T>(`api/mobile/v1/tenants/${tenantId}/financeiro/${path}`, {
    context: { accessToken, tenantId, branchId },
    retry: true,
  });
}

export function fetchFinanceSummary(input: {
  tenantId: string;
  branchId?: string | null;
}) {
  return financeGet<MobileFinanceSummary>(
    input.tenantId,
    "summary",
    input.branchId,
  );
}

export function fetchAccountsPayable(input: {
  tenantId: string;
  branchId?: string | null;
  page?: number;
  status?: string;
}) {
  const qs = new URLSearchParams();
  if (input.page) qs.set("page", String(input.page));
  if (input.status) qs.set("status", input.status);
  const suffix = qs.toString() ? `?${qs}` : "";
  return financeGet<MobileFinanceListResponse>(
    input.tenantId,
    `accounts-payable${suffix}`,
    input.branchId,
  );
}

export function fetchAccountsReceivable(input: {
  tenantId: string;
  branchId?: string | null;
  page?: number;
  status?: string;
}) {
  const qs = new URLSearchParams();
  if (input.page) qs.set("page", String(input.page));
  if (input.status) qs.set("status", input.status);
  const suffix = qs.toString() ? `?${qs}` : "";
  return financeGet<MobileFinanceListResponse>(
    input.tenantId,
    `accounts-receivable${suffix}`,
    input.branchId,
  );
}

export function fetchCashFlow(input: {
  tenantId: string;
  branchId?: string | null;
}) {
  return financeGet<MobileCashFlow>(input.tenantId, "cash-flow", input.branchId);
}

export function fetchDreMobile(input: {
  tenantId: string;
  branchId?: string | null;
}) {
  return financeGet<MobileDreSummary>(input.tenantId, "dre", input.branchId);
}

export function fetchFinanceApprovals(input: {
  tenantId: string;
  branchId?: string | null;
}) {
  return financeGet<MobileApprovalList>(
    input.tenantId,
    "approvals",
    input.branchId,
  );
}

export function fetchFinanceDetail(input: {
  tenantId: string;
  id: string;
  kind: "pagar" | "receber";
  branchId?: string | null;
}) {
  return financeGet<MobileFinanceDetail>(
    input.tenantId,
    `transactions/${input.id}?kind=${input.kind}`,
    input.branchId,
  );
}

/* —— Sprint 31.4 CRM —— */

export type MobileCrmDashboard = {
  generatedAt: string;
  updatedAtLabel: string;
  kpis: {
    receitaPrevista: string | null;
    receitaFechada: string | null;
    receitaProvavel: string | null;
    conversao: string | null;
    followUpsPendentes: number | null;
    negociosEmRisco: number | null;
    valorPipeline: string | null;
    ticketMedio: string | null;
  };
  forecast: {
    prevista: string | null;
    provavel: string | null;
    fechada: string | null;
    conversao: string | null;
  };
  ranking: { nome: string; prevista: string; fechada: string }[];
  alerts: {
    id: string;
    title: string;
    description: string;
    priority: string;
    category: string;
    href: string | null;
  }[];
  decisionBrief: string[];
  quickActions: {
    id: string;
    label: string;
    href: string;
    permission: string | null;
    enabled: boolean;
    opensWeb: boolean;
  }[];
  unavailable: string[];
};

export type MobileCrmPipeline = {
  columns: {
    stage: string;
    label: string;
    count: number;
    totalValor: string;
    cards: {
      id: string;
      nome: string;
      valor: string | null;
      score: number | null;
      origem: string | null;
      diasParado: number | null;
      responsavelId: string | null;
    }[];
  }[];
  unavailable: boolean;
};

export type MobileCrmClientList = {
  items: {
    id: string;
    nome: string;
    telefone: string | null;
    email: string | null;
    cidade: string | null;
    segmento: string | null;
    status: string | null;
    score: number | null;
    responsavel: string | null;
    ultimaInteracao: string | null;
    valorGerado: string | null;
  }[];
  total: number;
};

export type MobileCrmClientDetail = {
  id: string;
  nome: string;
  fields: { label: string; value: string }[];
  score: number | null;
  tags: string[];
};

export type MobileCrmTimeline = {
  items: {
    id: string;
    tipo: string;
    titulo: string;
    descricao: string | null;
    autor: string | null;
    at: string;
    clienteId: string | null;
    clienteNome: string | null;
  }[];
};

export type MobileCrmFollowups = {
  buckets: {
    id: string;
    label: string;
    items: {
      id: string;
      titulo: string;
      clienteNome: string;
      clienteId: string;
      dataRef: string;
      status: string;
      responsavelId: string | null;
    }[];
  }[];
};

export type MobileCrmForecast = {
  prevista: string | null;
  provavel: string | null;
  fechada: string | null;
  conversao: string | null;
  funil: { stage: string; count: number; valor: string; ponderado: string }[];
  porResponsavel: {
    nome: string;
    prevista: string;
    provavel: string;
    fechada: string;
  }[];
};

async function crmGet<T>(
  tenantId: string,
  path: string,
  branchId?: string | null,
) {
  const accessToken = await getAccessToken();
  return apiRequest<T>(`api/mobile/v1/tenants/${tenantId}/crm/${path}`, {
    context: { accessToken, tenantId, branchId },
    retry: true,
  });
}

export function fetchCrmDashboard(input: {
  tenantId: string;
  branchId?: string | null;
}) {
  return crmGet<MobileCrmDashboard>(input.tenantId, "dashboard", input.branchId);
}

export function fetchCrmPipeline(input: {
  tenantId: string;
  branchId?: string | null;
}) {
  return crmGet<MobileCrmPipeline>(input.tenantId, "pipeline", input.branchId);
}

export function fetchCrmClients(input: {
  tenantId: string;
  branchId?: string | null;
  q?: string;
}) {
  const q = input.q ? `?q=${encodeURIComponent(input.q)}` : "";
  return crmGet<MobileCrmClientList>(
    input.tenantId,
    `clients${q}`,
    input.branchId,
  );
}

export function fetchCrmClientDetail(input: {
  tenantId: string;
  id: string;
  branchId?: string | null;
}) {
  return crmGet<MobileCrmClientDetail>(
    input.tenantId,
    `clients/${input.id}`,
    input.branchId,
  );
}

export function fetchCrmTimeline(input: {
  tenantId: string;
  branchId?: string | null;
  clienteId?: string;
}) {
  const q = input.clienteId
    ? `?clienteId=${encodeURIComponent(input.clienteId)}`
    : "";
  return crmGet<MobileCrmTimeline>(
    input.tenantId,
    `timeline${q}`,
    input.branchId,
  );
}

export function fetchCrmFollowups(input: {
  tenantId: string;
  branchId?: string | null;
}) {
  return crmGet<MobileCrmFollowups>(input.tenantId, "followups", input.branchId);
}

export function fetchCrmForecast(input: {
  tenantId: string;
  branchId?: string | null;
}) {
  return crmGet<MobileCrmForecast>(input.tenantId, "forecast", input.branchId);
}

export function fetchCrmOpportunities(input: {
  tenantId: string;
  branchId?: string | null;
}) {
  return crmGet<{ items: Record<string, unknown>[] }>(
    input.tenantId,
    "opportunities",
    input.branchId,
  );
}

export function fetchCrmRanking(input: {
  tenantId: string;
  branchId?: string | null;
}) {
  return crmGet<{ items: Record<string, unknown>[] }>(
    input.tenantId,
    "ranking",
    input.branchId,
  );
}

export function fetchCrmAlerts(input: {
  tenantId: string;
  branchId?: string | null;
}) {
  return crmGet<{ alerts: MobileCrmDashboard["alerts"] }>(
    input.tenantId,
    "alerts",
    input.branchId,
  );
}

/* —— Sprint 31.5 Estoque / Compras —— */

export type MobileStockDashboard = {
  generatedAt: string;
  updatedAtLabel: string;
  kpis: {
    produtosCadastrados: number | null;
    valorEstoque: string | null;
    produtosCriticos: number | null;
    semEstoque: number | null;
    reposicaoUrgente: number | null;
    comprasAbertas: number | null;
  };
  recentMovements: {
    id: string;
    tipo: string;
    produtoNome: string;
    quantidade: string;
    at: string;
  }[];
  alerts: {
    id: string;
    title: string;
    description: string;
    priority: string;
    category: string;
    href: string | null;
  }[];
  quickActions: {
    id: string;
    label: string;
    href: string;
    permission: string | null;
    enabled: boolean;
    opensWeb: boolean;
  }[];
  unavailable: string[];
};

export type MobileStockProductList = {
  items: {
    id: string;
    nome: string;
    sku: string | null;
    categoria: string | null;
    marca: string | null;
    fornecedor: string | null;
    status: string;
    estoque: string;
    preco: string | null;
    critico: boolean;
  }[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
};

export type MobileStockProductDetail = {
  id: string;
  nome: string;
  fields: { label: string; value: string }[];
  tags: string[];
};

export type MobileStockMovements = {
  items: {
    id: string;
    tipo: string;
    produtoNome: string;
    sku: string | null;
    quantidade: string;
    motivo: string | null;
    origem: string;
    at: string;
  }[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
};

export type MobileStockInventory = {
  ready: boolean;
  ciclosAbertos: number | null;
  divergencias: number | null;
  ultimaConferencia: string | null;
  cycles: { id: string; kind: string; status: string; createdAt: string }[];
  criticalHints: string[];
  unavailable: boolean;
};

export type MobileStockPurchases = {
  ready: boolean;
  items: {
    id: string;
    numero: string;
    status: string;
    fornecedorId: string | null;
    valor: string | null;
    dataNecessidade: string | null;
    createdAt: string;
  }[];
  unavailable: boolean;
};

export type MobileStockPurchaseDetail = {
  id: string;
  numero: string;
  status: string;
  valor: string | null;
  dataNecessidade: string | null;
  createdAt: string;
  fornecedorId: string | null;
  items: { label: string; qty: string; valor: string | null }[];
  fields: { label: string; value: string }[];
};

export type MobileStockSuppliers = {
  items: {
    id: string;
    nome: string;
    contato: string | null;
    cidade: string | null;
    categoria: string | null;
    ativo: boolean;
    comprasRecentes?: number | null;
    valorComprado?: string | null;
  }[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
};

async function stockGet<T>(
  tenantId: string,
  path: string,
  branchId?: string | null,
) {
  const accessToken = await getAccessToken();
  return apiRequest<T>(`api/mobile/v1/tenants/${tenantId}/estoque/${path}`, {
    context: { accessToken, tenantId, branchId },
    retry: true,
  });
}

export function fetchStockDashboard(input: {
  tenantId: string;
  branchId?: string | null;
}) {
  return stockGet<MobileStockDashboard>(
    input.tenantId,
    "dashboard",
    input.branchId,
  );
}

export function fetchStockProducts(input: {
  tenantId: string;
  branchId?: string | null;
  q?: string;
  categoria?: string;
  status?: string;
  page?: number;
}) {
  const qs = new URLSearchParams();
  if (input.q) qs.set("q", input.q);
  if (input.categoria) qs.set("categoria", input.categoria);
  if (input.status) qs.set("status", input.status);
  if (input.page) qs.set("page", String(input.page));
  const suffix = qs.toString() ? `?${qs}` : "";
  return stockGet<MobileStockProductList>(
    input.tenantId,
    `produtos${suffix}`,
    input.branchId,
  );
}

export function fetchStockProductDetail(input: {
  tenantId: string;
  id: string;
  branchId?: string | null;
}) {
  return stockGet<MobileStockProductDetail>(
    input.tenantId,
    `produtos/${input.id}`,
    input.branchId,
  );
}

export function fetchStockCategories(input: {
  tenantId: string;
  branchId?: string | null;
}) {
  return stockGet<{ items: { label: string; valor: string | null }[] }>(
    input.tenantId,
    "categorias",
    input.branchId,
  );
}

export function fetchStockMovements(input: {
  tenantId: string;
  branchId?: string | null;
  q?: string;
  tipo?: string;
  page?: number;
}) {
  const qs = new URLSearchParams();
  if (input.q) qs.set("q", input.q);
  if (input.tipo) qs.set("tipo", input.tipo);
  if (input.page) qs.set("page", String(input.page));
  const suffix = qs.toString() ? `?${qs}` : "";
  return stockGet<MobileStockMovements>(
    input.tenantId,
    `movimentacoes${suffix}`,
    input.branchId,
  );
}

export function fetchStockInventory(input: {
  tenantId: string;
  branchId?: string | null;
}) {
  return stockGet<MobileStockInventory>(
    input.tenantId,
    "inventario",
    input.branchId,
  );
}

export function fetchStockPurchases(input: {
  tenantId: string;
  branchId?: string | null;
  status?: string;
}) {
  const qs = input.status
    ? `?status=${encodeURIComponent(input.status)}`
    : "";
  return stockGet<MobileStockPurchases>(
    input.tenantId,
    `compras${qs}`,
    input.branchId,
  );
}

export function fetchStockPurchaseDetail(input: {
  tenantId: string;
  id: string;
  branchId?: string | null;
}) {
  return stockGet<MobileStockPurchaseDetail>(
    input.tenantId,
    `compras/${input.id}`,
    input.branchId,
  );
}

export function fetchStockSuppliers(input: {
  tenantId: string;
  branchId?: string | null;
  q?: string;
  page?: number;
}) {
  const qs = new URLSearchParams();
  if (input.q) qs.set("q", input.q);
  if (input.page) qs.set("page", String(input.page));
  const suffix = qs.toString() ? `?${qs}` : "";
  return stockGet<MobileStockSuppliers>(
    input.tenantId,
    `fornecedores${suffix}`,
    input.branchId,
  );
}

export function fetchStockAlerts(input: {
  tenantId: string;
  branchId?: string | null;
}) {
  return stockGet<{ alerts: MobileStockDashboard["alerts"] }>(
    input.tenantId,
    "alertas",
    input.branchId,
  );
}

export function fetchStockReposicao(input: {
  tenantId: string;
  branchId?: string | null;
}) {
  return stockGet<{
    items: {
      produtoId: string;
      label: string;
      estoqueAtual: string;
      estoqueMinimo: string;
      quantidadeSugerida: string;
      pontoReposicao: string;
    }[];
  }>(input.tenantId, "reposicao", input.branchId);
}

/* —— Sprint 31.6 Operação —— */

export type MobileOpsDashboard = {
  generatedAt: string;
  updatedAtLabel: string;
  kpis: {
    aguardando: number | null;
    emExecucao: number | null;
    prontos: number | null;
    entreguesHoje: number | null;
    faturamento: string | null;
    ticketMedio: string | null;
    ocupacaoRecursos: string | null;
    produtividadeMecanicos: string | null;
  };
  recentOrders: {
    id: string;
    numero: string;
    status: string;
    cliente: string | null;
    veiculo: string | null;
  }[];
  alerts: {
    id: string;
    title: string;
    description: string;
    priority: string;
    category: string;
    href: string | null;
  }[];
  quickActions: {
    id: string;
    label: string;
    href: string;
    permission: string | null;
    enabled: boolean;
    opensWeb: boolean;
  }[];
  unavailable: string[];
};

export type MobileOpsWorkOrderList = {
  items: {
    id: string;
    numero: string;
    status: string;
    cliente: string | null;
    veiculo: string | null;
    valor: string | null;
    abertura: string;
    previsao: string | null;
    prioridade: string;
  }[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
};

export type MobileOpsWorkOrderDetail = {
  id: string;
  numero: string;
  status: string;
  cliente: string | null;
  veiculo: string | null;
  placa: string | null;
  mecanico: string | null;
  previsao: string | null;
  prioridade: string;
  heading?: string;
  assigneeLabel?: string;
  fields: { label: string; value: string }[];
  services: { id: string; label: string; qty: string; valor: string | null }[];
  parts: { id: string; label: string; qty: string; valor: string | null }[];
  timeline: {
    id: string;
    at: string;
    titulo: string;
    detalhe: string | null;
    kind: string;
  }[];
  photos: {
    id: string;
    label: string;
    createdAt: string;
    etapa: string;
    tipo: string;
    group: string;
    mimeType: string | null;
    thumbUrl: string | null;
  }[];
  attachments: {
    id: string;
    label: string;
    createdAt: string;
    etapa: string;
    tipo: string;
    group: string;
    mimeType: string | null;
    isPdf: boolean;
    isImage: boolean;
  }[];
  checklist: {
    id: string;
    codigo: string;
    label: string;
    status: string;
    classificacao: string;
    observacao: string | null;
    registradoEm: string | null;
    responsavelId: string | null;
    done: boolean;
  }[];
  checklistSummary: { done: number; pending: number; total: number };
  signatures: {
    id: string;
    label: string;
    createdAt: string;
    thumbUrl: string | null;
  }[];
  observations: string | null;
  canEdit: boolean;
  aceiteEntregaEm: string | null;
  webHref: string;
};

export type MobileOpsSchedule = {
  items: {
    id: string;
    titulo: string;
    status: string;
    inicio: string;
    fim: string;
    clienteId: string | null;
    osId: string | null;
    responsavelId: string | null;
  }[];
  conflicts: { a: string; b: string; reason: string }[];
  unavailable: boolean;
};

export type MobileOpsTeam = {
  items: {
    id: string;
    nome: string;
    status: string;
    especialidade: string | null;
    produtividade: string | null;
    emExecucao: number | null;
    ocupacao: string | null;
  }[];
};

export type MobileOpsVehicleList = {
  items: {
    id: string;
    placa: string | null;
    modelo: string | null;
    clienteId: string;
    clienteNome: string | null;
    km: number | null;
  }[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
};

export type MobileOpsVehicleDetail = {
  id: string;
  fields: { label: string; value: string }[];
  recentOrders: {
    id: string;
    numero: string;
    status: string;
    abertura: string;
  }[];
};

export type MobileOpsCustomerList = {
  items: {
    id: string;
    nome: string;
    telefone: string | null;
    email: string | null;
    cidade: string | null;
  }[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
};

export type MobileOpsCustomerDetail = {
  id: string;
  nome: string;
  fields: { label: string; value: string }[];
  vehicles: { id: string; label: string }[];
  recentOrders: { id: string; numero: string; status: string }[];
};

async function opsGet<T>(
  tenantId: string,
  path: string,
  branchId?: string | null,
) {
  const accessToken = await getAccessToken();
  return apiRequest<T>(`api/mobile/v1/tenants/${tenantId}/operacao/${path}`, {
    context: { accessToken, tenantId, branchId },
    retry: true,
  });
}

export function fetchOpsDashboard(input: {
  tenantId: string;
  branchId?: string | null;
}) {
  return opsGet<MobileOpsDashboard>(
    input.tenantId,
    "dashboard",
    input.branchId,
  );
}

export function fetchOpsWorkOrders(input: {
  tenantId: string;
  branchId?: string | null;
  q?: string;
  status?: string;
  page?: number;
}) {
  const qs = new URLSearchParams();
  if (input.q) qs.set("q", input.q);
  if (input.status) qs.set("status", input.status);
  if (input.page) qs.set("page", String(input.page));
  const suffix = qs.toString() ? `?${qs}` : "";
  return opsGet<MobileOpsWorkOrderList>(
    input.tenantId,
    `work-orders${suffix}`,
    input.branchId,
  );
}

export function fetchOpsWorkOrderDetail(input: {
  tenantId: string;
  id: string;
  branchId?: string | null;
}) {
  return opsGet<MobileOpsWorkOrderDetail>(
    input.tenantId,
    `work-orders/${input.id}`,
    input.branchId,
  );
}

async function opsMutate<T>(
  tenantId: string,
  path: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: unknown,
  branchId?: string | null,
) {
  const accessToken = await getAccessToken();
  return apiRequest<T>(`api/mobile/v1/tenants/${tenantId}/operacao/${path}`, {
    method,
    body,
    context: { accessToken, tenantId, branchId },
    retry: false,
  });
}

export function patchOpsChecklistItem(input: {
  tenantId: string;
  osId: string;
  checklistId: string;
  classificacao: string;
  observacao?: string | null;
  branchId?: string | null;
}) {
  return opsMutate<{ id: string }>(
    input.tenantId,
    `work-orders/${input.osId}/checklist/${input.checklistId}`,
    "PATCH",
    {
      classificacao: input.classificacao,
      observacao: input.observacao ?? null,
    },
    input.branchId,
  );
}

export function uploadOpsAnexo(input: {
  tenantId: string;
  osId: string;
  base64: string;
  mimeType: string;
  fileName: string;
  etapa: string;
  tipo?: string;
  legenda?: string | null;
  checklistItemId?: string | null;
  branchId?: string | null;
}) {
  return opsMutate<{ id: string }>(
    input.tenantId,
    `work-orders/${input.osId}/anexos`,
    "POST",
    {
      base64: input.base64,
      mimeType: input.mimeType,
      fileName: input.fileName,
      etapa: input.etapa,
      tipo: input.tipo ?? "foto",
      legenda: input.legenda ?? null,
      checklistItemId: input.checklistItemId ?? null,
    },
    input.branchId,
  );
}

export function deleteOpsAnexo(input: {
  tenantId: string;
  osId: string;
  anexoId: string;
  branchId?: string | null;
}) {
  return opsMutate<{ id: string }>(
    input.tenantId,
    `work-orders/${input.osId}/anexos/${input.anexoId}`,
    "DELETE",
    undefined,
    input.branchId,
  );
}

export function fetchOpsAnexoSignedUrl(input: {
  tenantId: string;
  osId: string;
  anexoId: string;
  branchId?: string | null;
}) {
  return opsGet<{ signedUrl: string; expiresIn: number }>(
    input.tenantId,
    `work-orders/${input.osId}/anexos/${input.anexoId}`,
    input.branchId,
  );
}

export function uploadOpsSignature(input: {
  tenantId: string;
  osId: string;
  base64: string;
  mimeType?: string;
  fileName?: string;
  branchId?: string | null;
}) {
  return opsMutate<{ id: string }>(
    input.tenantId,
    `work-orders/${input.osId}/assinatura`,
    "POST",
    {
      base64: input.base64,
      mimeType: input.mimeType ?? "image/png",
      fileName: input.fileName ?? "assinatura-cliente.png",
    },
    input.branchId,
  );
}

export function fetchOpsSchedule(input: {
  tenantId: string;
  branchId?: string | null;
  range?: "hoje" | "semana";
}) {
  const qs = input.range ? `?range=${encodeURIComponent(input.range)}` : "";
  return opsGet<MobileOpsSchedule>(
    input.tenantId,
    `schedule${qs}`,
    input.branchId,
  );
}

export function fetchOpsTeam(input: {
  tenantId: string;
  branchId?: string | null;
}) {
  return opsGet<MobileOpsTeam>(input.tenantId, "team", input.branchId);
}

export function fetchOpsVehicles(input: {
  tenantId: string;
  branchId?: string | null;
  q?: string;
  page?: number;
}) {
  const qs = new URLSearchParams();
  if (input.q) qs.set("q", input.q);
  if (input.page) qs.set("page", String(input.page));
  const suffix = qs.toString() ? `?${qs}` : "";
  return opsGet<MobileOpsVehicleList>(
    input.tenantId,
    `vehicles${suffix}`,
    input.branchId,
  );
}

export function fetchOpsVehicleDetail(input: {
  tenantId: string;
  id: string;
  branchId?: string | null;
}) {
  return opsGet<MobileOpsVehicleDetail>(
    input.tenantId,
    `vehicles/${input.id}`,
    input.branchId,
  );
}

export function fetchOpsCustomers(input: {
  tenantId: string;
  branchId?: string | null;
  q?: string;
  page?: number;
}) {
  const qs = new URLSearchParams();
  if (input.q) qs.set("q", input.q);
  if (input.page) qs.set("page", String(input.page));
  const suffix = qs.toString() ? `?${qs}` : "";
  return opsGet<MobileOpsCustomerList>(
    input.tenantId,
    `customers${suffix}`,
    input.branchId,
  );
}

export function fetchOpsCustomerDetail(input: {
  tenantId: string;
  id: string;
  branchId?: string | null;
}) {
  return opsGet<MobileOpsCustomerDetail>(
    input.tenantId,
    `customers/${input.id}`,
    input.branchId,
  );
}

export function fetchOpsNotifications(input: {
  tenantId: string;
  branchId?: string | null;
}) {
  return opsGet<{ alerts: MobileOpsDashboard["alerts"] }>(
    input.tenantId,
    "notifications",
    input.branchId,
  );
}

/* —— Sprint 31.7 Inteligência Operacional —— */

export type MobileIntelligenceAlertItem = {
  id: string;
  title: string;
  description: string;
  priority: string;
  category: string;
  source: string;
  href: string | null;
  suggestedAction: string | null;
};

export type MobileIntelligencePack = {
  generatedAt: string;
  updatedAtLabel: string;
  dashboard: MobileExecutiveDashboard;
  operational: {
    producaoDia: string | null;
    ordensAbertas: string | null;
    ordensAtrasadas: string | null;
    agendaDia: string | null;
    mecanicosAtivos: string | null;
    tempoMedioOs: string | null;
    ticketMedio: string | null;
    carrosEntregues: string | null;
    servicosPendentes: string | null;
    eficienciaOperacional: string | null;
    unavailable: string[];
    labels?: {
      mecanicosAtivos: string;
      ordensAbertas: string;
      ordensAtrasadas: string;
      tempoMedioOs: string;
    };
  };
  executiveBrief: MobileExecutiveDashboard["brief"];
  decision: MobileExecutiveDashboard["decision"];
  analyticsDecision: {
    available: boolean;
    headline: string | null;
    decisions: {
      id: string;
      title: string;
      recommendation: string;
      priority: string;
      href: string | null;
    }[];
    risks: string[];
    opportunities: string[];
    bottlenecks: string[];
  };
  kpiHealth: {
    metricId: string;
    name: string;
    level: "excelente" | "bom" | "atencao" | "critico";
    levelLabel: string;
    reason: string;
    trend: string;
    deltaPercent: number | null;
    formatted: string;
    historyHint: string;
  }[];
  alertCenter: {
    operacional: MobileIntelligenceAlertItem[];
    financeiro: MobileIntelligenceAlertItem[];
    crm: MobileIntelligenceAlertItem[];
    estoque: MobileIntelligenceAlertItem[];
    agenda: MobileIntelligenceAlertItem[];
    automacoes: MobileIntelligenceAlertItem[];
    sistema: MobileIntelligenceAlertItem[];
    total: number;
  };
  metas: MobileExecutiveDashboard["metas"] & {
    dayTrend: string | null;
    weekTrend: string | null;
    monthTrend: string | null;
  };
  quickActions: MobileExecutiveDashboard["quickActions"];
  moduleSync: {
    dashboard: string;
    operacao: string | null;
    crm: string | null;
    financeiro: string | null;
    estoque: string | null;
    lastSyncLabel: string;
  };
};

export async function fetchIntelligencePack(input: {
  tenantId: string;
  branchId?: string | null;
  branchName?: string | null;
}) {
  const accessToken = await getAccessToken();
  const headers: Record<string, string> = {};
  if (input.branchName) headers["x-gof-branch-name"] = input.branchName;
  return apiRequest<MobileIntelligencePack>(
    `api/mobile/v1/tenants/${input.tenantId}/inteligencia`,
    {
      context: {
        accessToken,
        tenantId: input.tenantId,
        branchId: input.branchId,
      },
      headers,
      retry: true,
    },
  );
}

/* —— Sprint 31.9 Produtividade — busca global —— */

export type MobileSearchHit = {
  id: string;
  type: string;
  title: string;
  subtitle: string | null;
  status: string | null;
  route: string;
  opensWeb: boolean;
  permission: string | null;
  updatedAt: string | null;
};

export type MobileSearchResult = {
  q: string;
  generatedAt: string;
  items: MobileSearchHit[];
  groups: Record<string, number>;
  nextCursor?: string | null;
};

export async function fetchMobileSearch(input: {
  tenantId: string;
  q: string;
  types?: string[] | null;
  branchId?: string | null;
  limit?: number;
  cursor?: string | null;
  signal?: AbortSignal;
}) {
  const accessToken = await getAccessToken();
  const qs = new URLSearchParams();
  qs.set("q", input.q);
  if (input.types?.length) qs.set("types", input.types.join(","));
  if (input.limit) qs.set("limit", String(input.limit));
  if (input.cursor) qs.set("cursor", input.cursor);
  if (input.branchId) qs.set("branchId", input.branchId);
  return apiRequest<MobileSearchResult>(
    `api/mobile/v1/tenants/${input.tenantId}/search?${qs}`,
    {
      context: {
        accessToken,
        tenantId: input.tenantId,
        branchId: input.branchId,
      },
      retry: true,
      signal: input.signal,
    },
  );
}
